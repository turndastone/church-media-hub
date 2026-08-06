import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { cn } from "@/lib/utils";
import { accentGradient, TYPE_META } from "./catalog-meta";
import type { Doc } from "@/convex/_generated/dataModel";

export function CoverArt({
  item,
  className,
  icon: Icon,
}: {
  item: Pick<
    Doc<"catalogItems">,
    "title" | "coverUrl" | "coverStorageId" | "accent" | "type"
  >;
  className?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const storageUrl = useQuery(
    api.catalog.getStorageUrl,
    item.coverStorageId ? { storageId: item.coverStorageId } : "skip",
  );

  if (item.coverUrl || storageUrl) {
    return (
      <div className={cn("relative overflow-hidden", className)}>
        <img
          src={item.coverUrl ?? storageUrl ?? undefined}
          alt={item.title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex items-end overflow-hidden bg-gradient-to-br",
        accentGradient(item.accent),
        "from-card via-card/60 to-card",
        className,
      )}
    >
      <div className="absolute inset-0 opacity-[0.35] [background-image:radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.25),transparent_55%)]" />
      {Icon && (
        <Icon className="absolute right-3 top-3 h-4 w-4 text-white/70" />
      )}
      <span className="absolute bottom-3 left-3 font-mono text-[9px] uppercase tracking-[0.25em] text-white/75">
        {TYPE_META[item.type].mono}
      </span>
    </div>
  );
}
