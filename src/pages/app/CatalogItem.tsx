import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useNavigate, useParams } from "react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CoverArt } from "@/components/cover-art";
import { TYPE_META } from "@/components/catalog-meta";
import { PageHeader } from "@/components/page-header";
import { formatDate, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ArrowLeft,
  Download,
  Heart,
  ListPlus,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";

export default function CatalogItem() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const item = useQuery(api.catalog.get, { id: id as Id<"catalogItems"> });
  const services = useQuery(api.services.list);
  const toggleLike = useMutation(api.catalog.toggleLike);
  const incrementDownload = useMutation(api.catalog.incrementDownload);
  const remove = useMutation(api.catalog.remove);
  const updateService = useMutation(api.services.update);

  const [adding, setAdding] = useState(false);

  if (!item) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-border bg-card p-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const liked = item.likedBy.includes(user?._id as Id<"users">);
  const isOwner = item.userId === user?._id;
  const canDelete = isOwner || user?.role === "admin";

  const handleLike = async () => {
    await toggleLike({ id: item._id });
  };

  const handleDownload = async () => {
    await incrementDownload({ id: item._id });
    toast.success("Added to downloads — check your media library");
  };

  const addToService = async (serviceId: string) => {
    const service = services?.find((s) => s._id === serviceId);
    if (!service) return;
    const already = service.items.some((i) => i.catalogItemId === item._id);
    if (already) {
      toast("Already in this service");
      return;
    }
    await updateService({
      id: serviceId as Id<"services">,
      items: [
        ...service.items,
        {
          label: item.title,
          type: item.type,
          reference: item.reference,
          content: item.body,
          catalogItemId: item._id,
        },
      ],
    });
    toast.success(`Added to ${service.title}`);
    setAdding(false);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${item.title}"?`)) return;
    await remove({ id: item._id });
    toast("Item deleted");
    navigate("/dashboard/catalog");
  };

  const isScripture = item.type === "scripture";

  return (
    <div className="flex flex-col gap-6">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit cursor-pointer gap-1.5 text-muted-foreground"
        onClick={() => navigate("/dashboard/catalog")}
      >
        <ArrowLeft className="h-4 w-4" /> Back to catalog
      </Button>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <CoverArt item={item} className="aspect-[4/3] w-full" />
            <div className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <span className="rounded-full border border-border bg-secondary px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {TYPE_META[item.type].label}
                </span>
                {!item.isApproved && (
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
                    Pending review
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg border border-border bg-secondary/50 p-2.5">
                  <p className="text-lg font-bold tracking-tight text-foreground">
                    {item.downloads}
                  </p>
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                    Downloads
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-secondary/50 p-2.5">
                  <p className="text-lg font-bold tracking-tight text-foreground">
                    {item.likedBy.length}
                  </p>
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                    Likes
                  </p>
                </div>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Added {timeAgo(item._creationTime)} · {formatDate(item._creationTime)}
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <PageHeader
            eyebrow={item.reference ?? TYPE_META[item.type].label}
            title={item.title}
            description={item.artist ? `by ${item.artist}` : undefined}
          />

          <div className="mt-5 flex flex-wrap gap-2">
            {item.tags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground"
              >
                #{t}
              </span>
            ))}
          </div>

          <div
            className={cn(
              "mt-6 rounded-xl border border-border bg-card p-6",
              isScripture && "border-accent/30 bg-accent/5",
            )}
          >
            {isScripture && (
              <p className="tech-label mb-3">Scripture display · KJV</p>
            )}
            <p className="whitespace-pre-wrap text-[15px] leading-7 text-foreground/90">
              {item.body ?? "No content provided."}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Button className="cursor-pointer gap-1.5" onClick={handleLike}>
              <Heart
                className={cn("h-4 w-4", liked && "fill-current")}
              />
              {liked ? "Liked" : "Like"}
            </Button>
            <Button
              variant="outline"
              className="cursor-pointer gap-1.5"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" /> Download
            </Button>
            <Dialog open={adding} onOpenChange={setAdding}>
              <DialogTrigger asChild>
                <Button variant="outline" className="cursor-pointer gap-1.5">
                  <ListPlus className="h-4 w-4" /> Add to service
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[70vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add to a service</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-1.5">
                  {(services ?? []).length === 0 && (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      No services yet — create one in Services first.
                    </p>
                  )}
                  {(services ?? []).map((s) => (
                    <button
                      key={s._id}
                      onClick={() => addToService(s._id)}
                      className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-3 py-2.5 text-left transition-colors hover:border-primary/40"
                    >
                      <div>
                        <p className="text-xs font-semibold text-foreground">{s.title}</p>
                        <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                          {s.items.length} items · {s.status}
                        </p>
                      </div>
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
            {canDelete && (
              <Button
                variant="ghost"
                className="ml-auto cursor-pointer gap-1.5 text-destructive hover:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
