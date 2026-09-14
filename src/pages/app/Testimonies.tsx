import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";
import {
  CheckCircle2,
  Clock3,
  Loader2,
  Quote,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";

export default function Testimonies() {
  const mine = useQuery(api.testimonies.listMine);
  const published = useQuery(api.testimonies.listApproved);
  const addTestimony = useMutation(api.testimonies.add);
  const removeMine = useMutation(api.testimonies.removeMine);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<Id<"testimonies"> | null>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim() || !body.trim() || busy) return;
    setBusy(true);
    try {
      await addTestimony({ title, body });
      toast.success("Testimony submitted — it will appear once approved.");
      setTitle("");
      setBody("");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: Id<"testimonies">) => {
    setRemoving(id);
    try {
      await removeMine({ id });
      toast("Testimony removed");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setRemoving(null);
    }
  };

  const pendingCount = (mine ?? []).filter((t) => !t.isApproved).length;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Church family"
        title="Testimonies"
        description="Share what God has done for you — your testimony becomes an encouragement to the whole parish."
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Left: submit + my testimonies */}
        <div className="flex flex-col gap-6">
          {/* Submit form */}
          <form
            onSubmit={submit}
            className="rounded-xl border border-primary/25 bg-card p-6"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Sparkles className="h-4.5 w-4.5" />
              </span>
              <div>
                <h2 className="text-sm font-bold tracking-tight">
                  Share your testimony
                </h2>
                <p className="text-xs text-muted-foreground">
                  A short title and your story — an admin will review it before
                  it is published.
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-3">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title, e.g. God answered my prayer"
                maxLength={140}
                className="h-10"
              />
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your testimony here…"
                rows={6}
                maxLength={4000}
                className="resize-none leading-6"
              />
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {body.trim().length}/4000
                </span>
                <Button
                  type="submit"
                  className="cursor-pointer gap-1.5"
                  disabled={busy || !title.trim() || !body.trim()}
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Submit testimony
                </Button>
              </div>
            </div>
          </form>

          {/* My testimonies */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight">My testimonies</h2>
              {pendingCount > 0 && (
                <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-accent">
                  {pendingCount} pending review
                </span>
              )}
            </div>

            {!mine ? (
              <div className="flex items-center justify-center rounded-xl border border-border bg-card p-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : mine.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
                <Quote className="mx-auto mb-2 h-5 w-5" />
                You haven't shared a testimony yet — the form above takes a
                minute and encourages the whole church.
              </div>
            ) : (
              mine.map((t) => (
                <div
                  key={t._id}
                  className="flex flex-wrap items-start gap-3 rounded-xl border border-border bg-card px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {t.title}
                      </p>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em]",
                          t.isApproved
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-accent/30 bg-accent/10 text-accent",
                        )}
                      >
                        {t.isApproved ? (
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Published
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="h-3 w-3" /> Pending review
                          </span>
                        )}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-3 text-[13px] leading-6 text-muted-foreground">
                      {t.body}
                    </p>
                    <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
                      {timeAgo(t._creationTime)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-destructive"
                    title="Remove testimony"
                    disabled={removing === t._id}
                    onClick={() => remove(t._id)}
                  >
                    {removing === t._id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: latest published testimonies */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold tracking-tight">
              Latest from the family
            </h2>
            <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-primary">
              Published
            </span>
          </div>
          {!published ? (
            <div className="flex items-center justify-center rounded-xl border border-border bg-card p-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : published.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
              No published testimonies yet — be the first to share!
            </div>
          ) : (
            published.map((t, i) => (
              <div
                key={t._id}
                className={cn(
                  "rounded-xl border bg-card p-5",
                  i === 0
                    ? "border-primary/40 glow-blue"
                    : "border-border",
                )}
              >
                <Quote className="h-4 w-4 rotate-180 text-primary" />
                <h3 className="mt-3 text-sm font-bold tracking-tight">
                  {t.title}
                </h3>
                <p className="mt-1.5 line-clamp-4 text-[13px] leading-6 text-muted-foreground">
                  {t.body}
                </p>
                <div className="mt-4 flex items-center gap-2.5 border-t border-white/10 pt-3">
                  <Avatar className="h-7 w-7 border border-white/10">
                    {t.author?.image && (
                      <AvatarImage src={t.author.image} alt={t.author.name ?? ""} />
                    )}
                    <AvatarFallback className="bg-primary/15 text-[10px] text-primary">
                      {initials(t.author?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-foreground">
                      {t.author?.name ?? "Church member"}
                    </p>
                    <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                      {timeAgo(t._creationTime)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}