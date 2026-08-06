import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";
import { formatDate, pluralize } from "@/lib/format";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import {
  ArrowDown,
  ArrowUp,
  CalendarPlus,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

type ServiceItem = Doc<"services">["items"][number];

const STATUSES = ["draft", "scheduled", "live", "completed"] as const;

function toDateInput(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Services() {
  const services = useQuery(api.services.list);
  const catalog = useQuery(api.catalog.list, {});
  const create = useMutation(api.services.create);
  const update = useMutation(api.services.update);
  const remove = useMutation(api.services.remove);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(toDateInput(Date.now() + 7 * 86400000));
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("draft");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const selected = useMemo(
    () => (services ?? []).find((s) => s._id === selectedId) ?? null,
    [services, selectedId],
  );

  useEffect(() => {
    if (selected) {
      setTitle(selected.title);
      setDate(toDateInput(selected.date));
      setStatus(selected.status);
      setNotes(selected.notes ?? "");
      setItems(selected.items);
    }
  }, [selected]);

  const handleCreate = async () => {
    const id = await create({
      title: `Sunday Service — ${new Date(Date.now() + 7 * 86400000).toLocaleDateString("en-US", { month: "long", day: "numeric" })}`,
      date: Date.now() + 7 * 86400000,
    });
    toast.success("Service created");
    setSelectedId(id);
  };

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await update({
        id: selectedId as Id<"services">,
        title,
        date: new Date(`${date}T12:00:00`).getTime(),
        status,
        notes,
        items,
      });
      toast.success("Service saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!selectedId) return;
    if (!confirm("Delete this service?")) return;
    await remove({ id: selectedId as Id<"services"> });
    toast("Service deleted");
    setSelectedId(null);
  };

  const addItem = (item: Doc<"catalogItems">) => {
    setItems((prev) => [
      ...prev,
      {
        label: item.title,
        type: item.type,
        reference: item.reference,
        content: item.body,
        catalogItemId: item._id,
      },
    ]);
    toast.success(`Added "${item.title}"`);
  };

  const move = (index: number, dir: -1 | 1) => {
    setItems((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  const catalogResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (catalog ?? [])
      .filter(
        (i) =>
          !q ||
          `${i.title} ${i.artist ?? ""} ${i.reference ?? ""}`.toLowerCase().includes(q),
      )
      .slice(0, 30);
  }, [catalog, query]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Run of show"
        title="Services"
        description="Plan the order of worship, attach content from the catalog, and drive it live from the control room."
        actions={
          <Button className="cursor-pointer gap-1.5" onClick={handleCreate}>
            <CalendarPlus className="h-4 w-4" /> New service
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* List */}
        <div className="lg:col-span-2">
          {!services ? (
            <div className="flex items-center justify-center rounded-xl border border-border bg-card p-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : services.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/40 p-6 text-sm text-muted-foreground">
              No services yet. Create one to start building the run-of-show.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {services.map((s) => (
                <button
                  key={s._id}
                  onClick={() => setSelectedId(s._id)}
                  className={cn(
                    "cursor-pointer rounded-xl border px-4 py-3 text-left transition-colors",
                    s._id === selectedId
                      ? "border-primary/60 bg-primary/10"
                      : "border-border bg-card hover:border-primary/40",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                      {s.title}
                    </p>
                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em]",
                        s.status === "live" &&
                          "border-accent/40 bg-accent/10 text-accent",
                        s.status === "scheduled" &&
                          "border-primary/40 bg-primary/10 text-primary",
                        s.status === "completed" && "border-border text-muted-foreground",
                        s.status === "draft" && "border-border text-muted-foreground",
                      )}
                    >
                      {s.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(s.date)} · {pluralize(s.items.length, "item")}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Editor */}
        <div className="lg:col-span-3">
          {!selectedId ? (
            <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
              Select a service to edit its run-of-show.
            </div>
          ) : (
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="tech-label">Title</span>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </label>
                <label className="space-y-1.5">
                  <span className="tech-label">Date</span>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </label>
              </div>
              <label className="space-y-1.5">
                <span className="tech-label">Status</span>
                <div className="flex flex-wrap gap-1.5">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      className={cn(
                        "cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        status === s
                          ? "border-primary/60 bg-primary/15 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </label>
              <label className="space-y-1.5">
                <span className="tech-label">Notes</span>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Stage notes, cues, transitions…"
                  rows={2}
                />
              </label>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="tech-label">Run of show · {items.length}</span>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="cursor-pointer gap-1.5">
                        <Plus className="h-3.5 w-3.5" /> Add from catalog
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Add from catalog</DialogTitle>
                      </DialogHeader>
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Search songs, scripture, backgrounds…"
                          className="pl-9"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {catalogResults.map((item) => (
                          <button
                            key={item._id}
                            onClick={() => addItem(item)}
                            className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-3 py-2.5 text-left transition-colors hover:border-primary/40"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-foreground">
                                {item.title}
                              </p>
                              <p className="truncate font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                                {item.type}
                                {item.reference ? ` · ${item.reference}` : ""}
                              </p>
                            </div>
                            <Plus className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                          </button>
                        ))}
                        {catalogResults.length === 0 && (
                          <p className="py-4 text-center text-xs text-muted-foreground">
                            No matches.
                          </p>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {items.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">
                    Empty run-of-show. Add songs, scripture, and templates from
                    the catalog.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {items.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2"
                      >
                        <span className="w-5 font-mono text-[10px] text-muted-foreground">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-foreground">
                            {item.label}
                          </p>
                          <p className="truncate font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                            {item.type}
                            {item.reference ? ` · ${item.reference}` : ""}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 cursor-pointer"
                          onClick={() => move(i, -1)}
                          disabled={i === 0}
                          title="Move up"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 cursor-pointer"
                          onClick={() => move(i, 1)}
                          disabled={i === items.length - 1}
                          title="Move down"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 cursor-pointer text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            setItems((prev) => prev.filter((_, j) => j !== i))
                          }
                          title="Remove"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-border pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="cursor-pointer text-destructive hover:text-destructive"
                  onClick={handleRemove}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                </Button>
                <Button
                  size="sm"
                  className="cursor-pointer"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Save service
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
