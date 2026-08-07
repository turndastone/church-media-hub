import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { formatDate, pluralize } from "@/lib/format";
import { useWorkspace, type SlideKind } from "./context";
import { Layers, Loader2 } from "lucide-react";

const KIND_MAP: Record<string, SlideKind> = {
  song: "song",
  scripture: "verse",
  background: "theme",
  template: "theme",
  note: "note",
};

export default function PresentationsPanel() {
  const { queueSlide } = useWorkspace();
  const services = useQuery(api.services.list);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(
    () => (services ?? []).find((s) => s._id === selectedId) ?? null,
    [services, selectedId],
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border p-3">
        <p className="tech-label">Presentations · run of show</p>
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
          {services ? pluralize(services.length, "service") : "…"}
        </span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[200px_1fr] gap-0 overflow-hidden">
        {/* Service list */}
        <div className="overflow-y-auto border-r border-border p-2">
          {!services ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : services.length === 0 ? (
            <p className="px-2 py-6 text-center text-[11px] text-muted-foreground">
              No services yet — plan them in Services.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {services.map((s) => (
                <button
                  key={s._id}
                  onClick={() => setSelectedId(s._id)}
                  className={cn(
                    "cursor-pointer rounded-lg border px-2.5 py-2 text-left transition-colors",
                    s._id === selectedId
                      ? "border-accent/50 bg-accent/10"
                      : "border-border bg-card hover:border-accent/30",
                  )}
                >
                  <p className="truncate text-[11px] font-semibold tracking-tight text-foreground">{s.title}</p>
                  <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.15em] text-muted-foreground">
                    {formatDate(s.date)} · {s.status}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Items */}
        <div className="overflow-y-auto p-2">
          {!selected ? (
            <p className="py-10 text-center text-[11px] text-muted-foreground">
              Select a presentation to drive its run-of-show.
            </p>
          ) : selected.items.length === 0 ? (
            <p className="py-10 text-center text-[11px] text-muted-foreground">
              This presentation has no items — add them in Services.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {selected.items.map((item, i) => (
                <button
                  key={i}
                  onClick={() =>
                    queueSlide({
                      kind: KIND_MAP[item.type] ?? "note",
                      title: item.label,
                      body: item.content,
                      sub: item.reference,
                    })
                  }
                  className="group flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-2.5 text-left transition-colors hover:border-accent/40 hover:bg-accent/5"
                >
                  <span className="w-6 shrink-0 font-mono text-[10px] text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold tracking-tight text-foreground">{item.label}</p>
                    <p className="truncate font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                      {item.type}
                      {item.reference ? ` · ${item.reference}` : ""}
                    </p>
                  </div>
                  <Layers className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
