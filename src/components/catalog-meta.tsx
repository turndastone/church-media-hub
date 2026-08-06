import type { Doc } from "@/convex/_generated/dataModel";

type ItemType = Doc<"catalogItems">["type"];

export const TYPE_META: Record<
  ItemType,
  { label: string; mono: string; dot: string }
> = {
  song: { label: "Song", mono: "SONG", dot: "bg-primary" },
  scripture: { label: "Scripture", mono: "SCRIPTURE", dot: "bg-accent" },
  background: { label: "Background", mono: "BACKGROUND", dot: "bg-cyan-400" },
  template: { label: "Template", mono: "TEMPLATE", dot: "bg-rose-400" },
};

export const ACCENTS: Record<string, string> = {
  violet: "from-violet-600/80 via-violet-500/30 to-transparent",
  amber: "from-amber-500/80 via-amber-400/30 to-transparent",
  cyan: "from-cyan-500/80 via-cyan-400/30 to-transparent",
  rose: "from-rose-600/80 via-rose-500/30 to-transparent",
  emerald: "from-emerald-500/80 via-emerald-400/30 to-transparent",
  indigo: "from-indigo-600/80 via-indigo-500/30 to-transparent",
};

export function accentGradient(accent?: string): string {
  return ACCENTS[accent ?? "violet"] ?? ACCENTS.violet;
}

export const ACCENT_SWATCHES = [
  "violet",
  "amber",
  "cyan",
  "rose",
  "emerald",
  "indigo",
] as const;
