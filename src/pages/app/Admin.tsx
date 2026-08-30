import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Navigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Check,
  Loader2,
  Trash2,
  Users,
} from "lucide-react";

const TABS = ["Overview", "Users", "Content review"] as const;
const ROLES = ["admin", "user", "member"] as const;

export default function Admin() {
  const isAdmin = useQuery(api.admin.isAdmin);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");

  if (isAdmin === false) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Administration"
        title="Admin"
        description="Manage the workspace — members, roles, and content review."
      />
      <div className="flex gap-1.5 rounded-lg border border-border p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              tab === t
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Overview" && <OverviewTab />}
      {tab === "Users" && <UsersTab />}
      {tab === "Content review" && <ReviewTab />}
    </div>
  );
}

function OverviewTab() {
  const stats = useQuery(api.admin.stats);
  if (!stats) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-border bg-card p-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  const cards = [
    { label: "Users", value: stats.users },
    { label: "Catalog items", value: stats.items },
    { label: "Pending review", value: stats.pendingItems },
    { label: "Total downloads", value: stats.downloads },
    { label: "Services", value: stats.services },
    { label: "Pro subscriptions", value: stats.proSubs },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border border-border bg-card p-4">
          <p className="text-2xl font-bold tracking-tight text-foreground">
            {c.value}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{c.label}</p>
        </div>
      ))}
    </div>
  );
}

function UsersTab() {
  const users = useQuery(api.admin.listUsers);
  const setRole = useMutation(api.admin.setRole);
  const [busy, setBusy] = useState<string | null>(null);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {!users ? (
        <div className="flex items-center justify-center p-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                  Member
                </th>
                <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                  Joined
                </th>
                <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                  Plan
                </th>
                <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                  Role
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-foreground">
                      {u.name || "Anonymous operator"}
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {u.email ?? "no email"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {timeAgo(u._creationTime)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em]",
                        u.plan === "pro"
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      {u.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      disabled={busy === u._id}
                      onChange={async (e) => {
                        setBusy(u._id);
                        try {
                          await setRole({
                            userId: u._id as Id<"users">,
                            role: e.target.value as (typeof ROLES)[number],
                          });
                          toast.success("Role updated");
                        } catch (err) {
                          toast.error((err as Error).message);
                        } finally {
                          setBusy(null);
                        }
                      }}
                      className="cursor-pointer rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-ring"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ReviewTab() {
  const pending = useQuery(api.admin.listPending);
  const approve = useMutation(api.admin.setApproval);
  const remove = useMutation(api.catalog.remove);

  return (
    <div className="flex flex-col gap-2">
      {!pending ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card p-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : pending.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
          <Users className="mx-auto mb-2 h-5 w-5" />
          No content awaiting review.
        </div>
      ) : (
        pending.map((item) => (
          <div
            key={item._id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {item.title}
              </p>
              <p className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {item.type} · {timeAgo(item._creationTime)}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                className="cursor-pointer gap-1.5"
                onClick={async () => {
                  await approve({ id: item._id, approved: true });
                  toast.success(`Approved "${item.title}"`);
                }}
              >
                <Check className="h-3.5 w-3.5" /> Approve
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="cursor-pointer gap-1.5 text-destructive hover:text-destructive"
                onClick={async () => {
                  await remove({ id: item._id });
                  toast("Item removed");
                }}
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
