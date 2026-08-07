import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Doc } from "@/convex/_generated/dataModel";
import { useWorkspace } from "./context";
import { ImagePlus, Layers, Loader2, UploadCloud } from "lucide-react";

export default function MediaPanel() {
  const { queueSlide } = useWorkspace();
  const backgrounds = useQuery(api.catalog.list, { type: "background" });
  const navigate = useNavigate();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-border p-3">
        <div>
          <p className="tech-label">Image / Video</p>
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
            Backgrounds & media
          </p>
        </div>
        <Button size="sm" variant="outline" className="cursor-pointer gap-1.5" onClick={() => navigate("/dashboard/upload")}>
          <UploadCloud className="h-3.5 w-3.5" /> Upload media
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {!backgrounds ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : backgrounds.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <ImagePlus className="h-8 w-8 text-muted-foreground/50" />
            <p className="max-w-xs text-xs text-muted-foreground">
              No backgrounds yet. Upload worship backgrounds, motion loops, and
              videos to queue them here.
            </p>
            <Button size="sm" variant="outline" className="cursor-pointer gap-1.5" onClick={() => navigate("/dashboard/upload")}>
              <UploadCloud className="h-3.5 w-3.5" /> Upload media
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {backgrounds.map((b) => (
              <BgCard
                key={b._id}
                item={b}
                onQueue={(url) =>
                  queueSlide({
                    kind: "media",
                    title: b.title,
                    mediaUrl: url,
                    accent: b.accent,
                    sub: b.tags.slice(0, 2).join(" · ") || "background",
                  })
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BgCard({
  item,
  onQueue,
}: {
  item: Pick<
    Doc<"catalogItems">,
    "_id" | "title" | "coverUrl" | "coverStorageId" | "accent"
  >;
  onQueue: (url: string) => void;
}) {
  const storageUrl = useQuery(
    api.catalog.getStorageUrl,
    item.coverStorageId ? { storageId: item.coverStorageId } : "skip",
  );
  const url = item.coverUrl ?? storageUrl ?? "";

  return (
    <button
      onClick={() => url && onQueue(url)}
      disabled={!url}
      className={cn(
        "group relative flex aspect-video cursor-pointer items-end overflow-hidden rounded-lg border border-border text-left transition-colors",
        url ? "hover:border-accent/50" : "cursor-not-allowed opacity-50",
      )}
      style={{
        background: item.accent
          ? `linear-gradient(135deg, ${item.accent}, #0a0a0f)`
          : "linear-gradient(135deg, #27272a, #09090b)",
      }}
    >
      {url ? (
        <img src={url} alt={item.title} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      {url && (
        <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
          <Layers className="h-3.5 w-3.5 text-white/80" />
        </div>
      )}
      <p className="relative p-2.5 text-[11px] font-semibold tracking-tight text-white">{item.title}</p>
    </button>
  );
}
