import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { CoverArt } from "@/components/cover-art";
import { TYPE_META } from "@/components/catalog-meta";
import { cn } from "@/lib/utils";
import type { Doc } from "@/convex/_generated/dataModel";
import { Download, Heart, Loader2, Search, UploadCloud } from "lucide-react";

const TYPES = ["all", "song", "scripture", "background", "template"] as const;

export default function Catalog() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]>("all");
  const [scope, setScope] = useState<"all" | "mine">("all");

  const items = useQuery(api.catalog.list, {
    q: q || undefined,
    type: type === "all" ? undefined : type,
    scope,
  });

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Content library"
        title="Catalog"
        description="Songs, scripture, backgrounds, and templates — browse the shared library or your own uploads."
        actions={
          <Button asChild className="cursor-pointer gap-1.5">
            <Link to="/dashboard/upload">
              <UploadCloud className="h-4 w-4" /> Upload content
            </Link>
          </Button>
        }
      />

      {/* Controls */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search titles, artists, references, tags…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5">
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={cn(
                  "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  type === t
                    ? "border-primary/60 bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                {t === "all" ? "All" : TYPE_META[t].label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex rounded-lg border border-border p-0.5">
            {(["all", "mine"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={cn(
                  "cursor-pointer rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  scope === s
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s === "all" ? "Library" : "My uploads"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      {!items ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card p-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-10 text-center">
          <p className="text-sm font-semibold text-foreground">Nothing here yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try a different search, or upload the first asset to the library.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <CatalogCard key={item._id} item={item} onClick={() => navigate(`/dashboard/catalog/${item._id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}

export function CatalogCard({
  item,
  onClick,
}: {
  item: Doc<"catalogItems">;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group cursor-pointer overflow-hidden rounded-xl border border-border bg-card text-left transition-colors hover:border-primary/40"
    >
      <CoverArt item={item} className="aspect-[4/3] w-full" />
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold tracking-tight text-foreground">
            {item.title}
          </p>
          <span
            className={cn(
              "h-1.5 w-1.5 shrink-0 rounded-full",
              item.type === "song" && "bg-primary",
              item.type === "scripture" && "bg-accent",
              item.type === "background" && "bg-cyan-400",
              item.type === "template" && "bg-rose-400",
            )}
          />
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {item.artist || item.reference || TYPE_META[item.type].label}
        </p>
        <div className="mt-2 flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Download className="h-3 w-3" /> {item.downloads}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3" /> {item.likedBy.length}
          </span>
          {!item.isApproved && (
            <span className="text-accent">pending review</span>
          )}
        </div>
      </div>
    </button>
  );
}
