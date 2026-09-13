import { api } from "@/convex/_generated/api";
import { useAction, useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Navigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  clearErrors,
  dismissError,
  errorSourceLabel,
  useTrackedErrors,
} from "@/lib/error-tracker";
import type { Id } from "@/convex/_generated/dataModel";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Loader2,
  Lock,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";

const TABS = ["Overview", "Users", "Content review", "Errors"] as const;
const ROLES = ["admin", "user", "member"] as const;
const SOURCE_TONE: Record<string, string> = {
  runtime: "border-destructive/30 bg-destructive/10 text-destructive",
  promise: "border-amber-400/30 bg-amber-400/10 text-amber-400",
  console: "border-border text-muted-foreground",
  boundary: "border-primary/40 bg-primary/10 text-primary",
  manual: "border-border bg-secondary/50 text-foreground",
};
const PIN_SESSION_KEY = "admin_pin_ok";

export default function Admin() {
  const isAdmin = useQuery(api.admin.isAdmin);
  const hasPin = useQuery(api.apiKeys.hasAdminPin);
  const verifyPin = useAction(api.apiKeys.verifyAdminPin);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [pinUnlocked, setPinUnlocked] = useState(() => {
    try {
      return sessionStorage.getItem(PIN_SESSION_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [pinValue, setPinValue] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const trackedErrors = useTrackedErrors();
  const errorCount = trackedErrors.reduce((sum, e) => sum + e.count, 0);

  if (isAdmin === false) {
    return <Navigate to="/dashboard" replace />;
  }

  if (hasPin && !pinUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 rounded-xl border border-dashed border-border bg-card/40 p-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Lock className="h-6 w-6" />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">Admin PIN required</p>
          <p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">
            This section is protected. Enter the admin PIN to continue.
          </p>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!pinValue.trim()) return;
            setPinBusy(true);
            try {
              const ok = await verifyPin({ pin: pinValue.trim() });
              if (ok) {
                try { sessionStorage.setItem(PIN_SESSION_KEY, "1"); } catch {}
                setPinUnlocked(true);
                toast.success("PIN verified");
              } else {
                toast.error("Incorrect PIN");
                setPinValue("");
              }
            } catch {
              toast.error("Verification failed");
            } finally {
              setPinBusy(false);
            }
          }}
          className="flex w-full max-w-xs flex-col gap-3"
        >
          <Input
            type="password"
            placeholder="Enter admin PIN"
            value={pinValue}
            onChange={(e) => setPinValue(e.target.value)}
            className="text-center"
            autoFocus
          />
          <Button type="submit" disabled={pinBusy} className="cursor-pointer gap-2">
            {pinBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Verify
          </Button>
        </form>
      </div>
    );
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
            {t === "Errors" && errorCount > 0 && (
              <span
                className={cn(
                  "ml-1.5 inline-flex min-w-4 items-center justify-center rounded-full px-1 font-mono text-[9px] leading-4 tabular-nums",
                  tab === t
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-destructive/15 text-destructive",
                )}
              >
                {errorCount}
              </span>
            )}
          </button>
        ))}
      </div>
      {tab === "Overview" && <OverviewTab />}
      {tab === "Users" && <UsersTab />}
      {tab === "Content review" && <ReviewTab />}
      {tab === "Errors" && <ErrorsTab />}
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

function ErrorsTab() {
  const errors = useTrackedErrors();
  const [expanded, setExpanded] = useState<string | null>(null);
  const total = errors.reduce((sum, e) => sum + e.count, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary/50">
            <AlertTriangle
              className={cn(
                "h-4 w-4",
                errors.length ? "text-destructive" : "text-muted-foreground",
              )}
            />
          </span>
          <div>
            <p className="text-sm font-bold tracking-tight text-foreground">
              {errors.length === 0
                ? "No errors captured"
                : `${errors.length} unique error${errors.length === 1 ? "" : "s"} · ${total} occurrence${total === 1 ? "" : "s"}`}
            </p>
            <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
              Runtime crashes, rejected promises, and console errors captured in this
              browser. Resetting clears the log instantly.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="cursor-pointer gap-1.5"
          disabled={errors.length === 0}
          onClick={() => {
            const removed = clearErrors();
            toast.success(
              removed
                ? `Cleared ${removed} error${removed === 1 ? "" : "s"}`
                : "Error log is already empty",
            );
          }}
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset all errors
        </Button>
      </div>

      {errors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
          <ShieldCheck className="mx-auto mb-2 h-5 w-5" />
          All clear — no errors have been captured.
        </div>
      ) : (
        errors.map((e) => {
          const isOpen = expanded === e.id;
          return (
            <div
              key={e.id}
              className="rounded-xl border border-border bg-card px-4 py-3"
            >
              <div className="flex flex-wrap items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em]",
                    SOURCE_TONE[e.source] ?? SOURCE_TONE.manual,
                  )}
                >
                  {errorSourceLabel(e.source)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium text-foreground">
                    {e.message}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {e.context ? `${e.context} · ` : ""}
                    {timeAgo(e.lastSeen)}
                    {e.count > 1 ? ` · ×${e.count}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {e.stack && (
                    <button
                      onClick={() => setExpanded(isOpen ? null : e.id)}
                      className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      Details
                      <ChevronDown
                        className={cn(
                          "h-3 w-3 transition-transform",
                          isOpen && "rotate-180",
                        )}
                      />
                    </button>
                  )}
                  <button
                    onClick={() => dismissError(e.id)}
                    title="Dismiss"
                    className="cursor-pointer rounded-md p-1 text-muted-foreground/60 transition-colors hover:bg-secondary hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {isOpen && e.stack && (
                <pre className="mt-3 max-h-56 overflow-auto rounded-lg border border-border/60 bg-secondary/40 p-3 text-left text-[10px] leading-4 text-muted-foreground">
                  {e.stack}
                </pre>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
