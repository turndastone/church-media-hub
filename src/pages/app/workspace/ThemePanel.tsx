import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Loader2, Layers } from "lucide-react";
import { useWorkspace } from "./context";

const PRESETS: { label: string; accent: string }[] = [
  { label: "Royal Purple", accent: "#7c3aed" },
  { label: "Ember", accent: "#ea580c" },
  { label: "Deep Ocean", accent: "#0284c7" },
  { label: "Forest", accent: "#16a34a" },
  { label: "Rose", accent: "#e11d48" },
  { label: "Gold", accent: "#ca8a04" },
  { label: "Indigo", accent: "#4f46e5" },
  { label: "Slate", accent: "#475569" },
];

export default function ThemePanel() {
  const { queueSlide } = useWorkspace();
  const templates = useQuery(api.catalog.list, { type: "template" });

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="border-b border-border p-3">
        <p className="tech-label">Quick themes</p>
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => queueSlide({ kind: "theme", title: p.label, accent: p.accent })}
              className="group flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-border p-2 transition-colors hover:border-accent/40"
            >
              <span
                className="h-6 w-full rounded-md transition-transform group-hover:scale-105"
                style={{ background: `linear-gradient(135deg, ${p.accent}, #0a0a0f)` }}
              />
              <span className="text-[9px] font-medium text-muted-foreground">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <p className="tech-label mb-2">Templates</p>
        {!templates ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : templates.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No templates yet — publish background/template items from the Upload page.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {templates.map((t) => (
              <button
                key={t._id}
                onClick={() =>
                  queueSlide({
                    kind: "theme",
                    title: t.title,
                    body: t.body,
                    accent: t.accent,
                  })
                }
                className="group relative flex aspect-video cursor-pointer items-end overflow-hidden rounded-lg border border-border p-3 text-left transition-colors hover:border-accent/40"
                style={{
                  background: t.accent
                    ? `linear-gradient(135deg, ${t.accent}, #0a0a0f)`
                    : "linear-gradient(135deg, #27272a, #09090b)",
                }}
              >
                <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <Layers className="h-3.5 w-3.5 text-white/80" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold tracking-tight text-white">{t.title}</p>
                  <p className="truncate font-mono text-[9px] uppercase tracking-[0.18em] text-white/60">
                    {t.tags.slice(0, 2).join(" · ") || "template"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
