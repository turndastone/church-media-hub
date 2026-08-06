import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/page-header";
import { ACCENT_SWATCHES, accentGradient } from "@/components/catalog-meta";
import { cn } from "@/lib/utils";
import { getSupabaseEnv, uploadToSupabase } from "@/lib/supabase";
import type { Id } from "@/convex/_generated/dataModel";
import { ImagePlus, Loader2, UploadCloud } from "lucide-react";

const TYPES = ["song", "scripture", "background", "template"] as const;
const TYPE_HINTS: Record<(typeof TYPES)[number], string> = {
  song: "Song lyrics for projection",
  scripture: "A Bible verse for the display",
  background: "Motion or still media loop",
  template: "Slide layout or reusable card",
};

export default function Upload() {
  const navigate = useNavigate();
  const create = useMutation(api.catalog.create);
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl);

  const [type, setType] = useState<(typeof TYPES)[number]>("song");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [reference, setReference] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [accent, setAccent] = useState<string>("violet");
  const [isPublic, setIsPublic] = useState(true);
  const [coverUrl, setCoverUrl] = useState<string | undefined>();
  const [coverStorageId, setCoverStorageId] = useState<
    Id<"_storage"> | undefined
  >();
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const supabaseOn = !!getSupabaseEnv();

  const handleCoverFile = async (file: File) => {
    setUploadingCover(true);
    try {
      if (supabaseOn) {
        const res = await uploadToSupabase(file);
        if ("url" in res) {
          setCoverUrl(res.url);
          setCoverStorageId(undefined);
          toast.success("Cover uploaded to Supabase storage");
        } else {
          toast.error(res.error);
        }
      } else {
        const uploadUrl = await generateUploadUrl();
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId } = (await res.json()) as { storageId: string };
        setCoverStorageId(storageId as Id<"_storage">);
        setCoverUrl(undefined);
        toast.success("Cover uploaded");
      }
    } catch (e) {
      toast.error(`Upload failed: ${(e as Error).message}`);
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Give your content a title");
      return;
    }
    setSaving(true);
    try {
      const id = await create({
        type,
        title,
        body: body || undefined,
        reference: reference || undefined,
        artist: artist || undefined,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        coverUrl,
        coverStorageId,
        accent,
        isPublic,
      });
      toast.success("Content published to the catalog");
      navigate(`/dashboard/catalog/${id}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Content pipeline"
        title="Upload content"
        description="Publish songs, scripture, backgrounds, and templates for your media team — then wire them into services and the live stream."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <label className="block space-y-1.5">
            <span className="tech-label">Content type</span>
            <div className="flex flex-wrap gap-1.5">
              {TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={cn(
                    "cursor-pointer rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                    type === t
                      ? "border-primary/60 bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {TYPE_HINTS[type]}
            </p>
          </label>

          <label className="block space-y-1.5">
            <span className="tech-label">Title</span>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                type === "scripture" ? "e.g. John 3:16" : "e.g. Way Maker"
              }
            />
          </label>

          {type === "song" && (
            <label className="block space-y-1.5">
              <span className="tech-label">Artist / writer</span>
              <Input
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="e.g. Sinach"
              />
            </label>
          )}
          {type === "scripture" && (
            <label className="block space-y-1.5">
              <span className="tech-label">Reference</span>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. John 3:16"
              />
            </label>
          )}

          <label className="block space-y-1.5">
            <span className="tech-label">
              {type === "song"
                ? "Lyrics"
                : type === "scripture"
                  ? "Verse text"
                  : "Description"}
            </span>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={7}
              placeholder={
                type === "scripture"
                  ? "For God so loved the world…"
                  : "Paste the lyrics or describe the asset…"
              }
            />
          </label>

          <label className="block space-y-1.5">
            <span className="tech-label">Tags (comma separated)</span>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="worship, opening, prayer"
            />
          </label>

          <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <div>
              <p className="text-sm font-semibold tracking-tight text-foreground">
                Public in the library
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Private uploads are visible only to you until approved.
              </p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="tech-label mb-3">Cover art</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleCoverFile(f);
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/40 transition-colors hover:border-primary/40"
            >
              {uploadingCover ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : coverUrl || coverStorageId ? (
                <img
                  src={coverUrl}
                  className="h-full w-full object-cover"
                  alt="Cover preview"
                />
              ) : (
                <>
                  <ImagePlus className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {supabaseOn
                      ? "Upload to Supabase storage"
                      : "Upload to app storage"}
                  </span>
                </>
              )}
            </button>
            <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
              {supabaseOn
                ? "Supabase keys detected — covers land in the “media” bucket."
                : "No Supabase keys yet — covers use built-in storage. Add VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY to enable cloud media storage."}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="tech-label mb-3">Accent color</p>
            <div className="flex flex-wrap gap-2">
              {ACCENT_SWATCHES.map((a) => (
                <button
                  key={a}
                  onClick={() => setAccent(a)}
                  className={cn(
                    "h-8 w-8 cursor-pointer rounded-lg border bg-gradient-to-br",
                    accentGradient(a),
                    accent === a
                      ? "border-primary ring-2 ring-primary/40"
                      : "border-border",
                  )}
                  title={a}
                />
              ))}
            </div>
          </div>

          <Button
            className="w-full cursor-pointer gap-1.5"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="h-4 w-4" />
            )}
            Publish to catalog
          </Button>
        </div>
      </div>
    </div>
  );
}
