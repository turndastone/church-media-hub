import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/page-header";
import { CURATED_VERSES, detectVerses } from "@/lib/scripture";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  BookOpenText,
  Loader2,
  Mic,
  Projector,
  Save,
  ScanSearch,
  Trash2,
  Wand2,
} from "lucide-react";

export default function Scripture() {
  const transcripts = useQuery(api.transcripts.list);
  const connections = useQuery(api.connections.list);
  const createTranscript = useMutation(api.transcripts.create);
  const removeTranscript = useMutation(api.transcripts.remove);

  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [detected, setDetected] = useState<{ reference: string; text: string }[]>([]);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [busy, setBusy] = useState(false);

  const verseCount = (transcripts ?? []).reduce((s, t) => s + t.verses.length, 0);

  const runDetection = () => {
    if (!text.trim()) {
      toast.error("Paste a sermon transcript first");
      return;
    }
    const verses = detectVerses(text);
    setDetected(verses);
    if (verses.length === 0) {
      toast("No Bible references detected — try pasting more text");
    } else {
      toast.success(`Detected ${verses.length} verse reference${verses.length === 1 ? "" : "s"}`);
    }
  };

  const handleSave = async () => {
    if (!text.trim()) {
      toast.error("Nothing to save");
      return;
    }
    setBusy(true);
    try {
      const verses = detected.length > 0 ? detected : detectVerses(text);
      await createTranscript({
        title: title || `Sermon · ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
        sourceText: text,
        verses,
      });
      toast.success("Transcript saved");
      setText("");
      setTitle("");
      setDetected([]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const projectVerse = async (reference: string) => {
    const conn = (connections ?? []).find((c) => c.app === "pewbeam");
    if (!conn?.url) {
      toast.error("Configure the Pewbeam hook in the Control Room to project verses.");
      return;
    }
    try {
      await fetch(conn.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(conn.token ? { Authorization: `Bearer ${conn.token}` } : {}),
        },
        body: JSON.stringify({ action: "show", token: conn.token ?? null, payload: { reference } }),
      });
      toast.success(`Projecting ${reference} via Pewbeam`);
    } catch (e) {
      toast.error(`Pewbeam request failed: ${(e as Error).message}`);
    }
  };

  const library = useMemo(() => {
    const q = libraryQuery.trim().toLowerCase();
    return CURATED_VERSES.filter(
      (v) =>
        !q ||
        v.reference.toLowerCase().includes(q) ||
        v.text.toLowerCase().includes(q),
    ).slice(0, 20);
  }, [libraryQuery]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Verse detection"
        title="Scripture"
        description="Paste a sermon transcript and Alpha Worship One detects every Bible reference — then project the verses live through Pewbeam."
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
            <ScanSearch className="h-3 w-3" />
            {verseCount} verses detected
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Transcriber */}
        <div className="space-y-4 lg:col-span-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-secondary">
                <Mic className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="text-sm font-semibold tracking-tight text-foreground">
                  Sermon transcript
                </p>
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                  Paste · detect · project
                </p>
              </div>
            </div>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={12}
              placeholder={"Paste the sermon transcript here…\n\n“We read in John 3:16 that God so loved the world. And as Paul reminds us in Philippians 4:13…”"}
              className="font-mono text-xs leading-5"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" className="cursor-pointer gap-1.5" onClick={runDetection}>
                <Wand2 className="h-3.5 w-3.5" /> Detect verses
              </Button>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Transcript title (optional)"
                className="max-w-[220px] text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                className="ml-auto cursor-pointer gap-1.5"
                onClick={handleSave}
                disabled={busy}
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save transcript
              </Button>
            </div>
          </div>

          {detected.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="tech-label mb-3">
                Detected references · {detected.length}
              </p>
              <div className="flex flex-col gap-2">
                {detected.map((v, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-lg border border-accent/25 bg-accent/5 p-3"
                  >
                    <BookOpenText className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold tracking-tight text-accent">
                        {v.reference}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-foreground/85">
                        {v.text || "Verse text not in the built-in library — add it to the catalog to project."}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 cursor-pointer gap-1.5"
                      onClick={() => projectVerse(v.reference)}
                    >
                      <Projector className="h-3.5 w-3.5" /> Project
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Saved transcripts */}
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="tech-label mb-3">Saved transcripts</p>
            {!transcripts ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : transcripts.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nothing saved yet. Detect verses, then save the transcript.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {transcripts.map((t) => (
                  <div
                    key={t._id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-foreground">
                        {t.title}
                      </p>
                      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                        {t.verses.length} verses · {timeAgo(t._creationTime)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 cursor-pointer text-muted-foreground hover:text-destructive"
                      onClick={async () => {
                        await removeTranscript({ id: t._id });
                        toast("Transcript deleted");
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Verse library */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="tech-label mb-3">Verse library · KJV</p>
            <Input
              value={libraryQuery}
              onChange={(e) => setLibraryQuery(e.target.value)}
              placeholder="Search by reference or text…"
              className="mb-3 text-xs"
            />
            <div className="flex max-h-[520px] flex-col gap-2 overflow-y-auto pr-1">
              {library.map((v) => (
                <div
                  key={v.reference}
                  className="rounded-lg border border-border bg-secondary/30 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold tracking-tight text-accent">
                      {v.reference}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 cursor-pointer gap-1 px-2 text-[10px]"
                      onClick={() => projectVerse(v.reference)}
                    >
                      <Projector className="h-3 w-3" /> Project
                    </Button>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-5 text-foreground/80">
                    {v.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
