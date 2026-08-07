import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { CoverArt } from "@/components/cover-art";
import { cn } from "@/lib/utils";
import { useWorkspace } from "./context";
import { Layers, Loader2, Music2, Search } from "lucide-react";

export default function SongPanel() {
  const { queueSlide } = useWorkspace();
  const songs = useQuery(api.catalog.list, { type: "song" });
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return (songs ?? []).filter(
      (s) =>
        !ql ||
        `${s.title} ${s.artist ?? ""} ${s.tags.join(" ")}`.toLowerCase().includes(ql),
    );
  }, [songs, q]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border p-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search songs or artists…"
            className="pl-8 text-xs"
          />
        </div>
        <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
          {songs ? `${filtered.length} songs` : "…"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {!songs ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-xs text-muted-foreground">
            No songs yet — add them from the Upload page or the catalog.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {filtered.map((s) => (
              <button
                key={s._id}
                onClick={() =>
                  queueSlide({
                    kind: "song",
                    title: s.title,
                    body: s.body,
                    sub: s.artist,
                    accent: s.accent,
                  })
                }
                className="group flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-2.5 text-left transition-colors hover:border-accent/40 hover:bg-accent/5"
              >
                <CoverArt item={s} className="h-10 w-10 shrink-0 rounded-md" icon={Music2} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold tracking-tight text-foreground">{s.title}</p>
                  <p className="truncate font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                    {s.artist ?? "Unknown artist"}
                  </p>
                </div>
                <Layers
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100",
                  )}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
