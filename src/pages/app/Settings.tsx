import { api } from "@/convex/_generated/api";
import { useAction, useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { testSupabaseConnection, useSupabaseEnv } from "@/lib/supabase";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SetupChecklist } from "@/components/SetupChecklist";
import {
  BookOpenText,
  Cable,
  CheckCircle2,
  CircleDashed,
  Database,
  KeyRound,
  Loader2,
  MonitorPlay,
  Radio,
  Save,
  Sparkles,
  Wand2,
} from "lucide-react";

export default function Settings() {
  const navigate = useNavigate();
  const currentUser = useQuery(api.users.currentUser);
  const connections = useQuery(api.connections.list);
  const updateProfile = useMutation(api.users.updateProfile);

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [supaStatus, setSupaStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [testingSupa, setTestingSupa] = useState(false);

  const integrationStatus = useAction(api.integrations.status);
  const [serverKeys, setServerKeys] = useState<{
    stripe: boolean;
    paystack: boolean;
    gemini: boolean;
    bibleApi: boolean;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    integrationStatus()
      .then((s) => {
        if (!cancelled) setServerKeys(s);
      })
      .catch(() => {
        if (!cancelled) {
          setServerKeys({
            stripe: false,
            paystack: false,
            gemini: false,
            bibleApi: false,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [integrationStatus]);

  const supaEnv = useSupabaseEnv();
  const supabaseOn = !!supaEnv;

  const connByApp = new Map((connections ?? []).map((c) => [c.app, c]));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ name });
      toast.success("Profile saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestSupabase = async () => {
    setTestingSupa(true);
    try {
      setSupaStatus(await testSupabaseConnection(supaEnv));
    } finally {
      setTestingSupa(false);
    }
  };

  type Integration = {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    desc: string;
    configured: boolean;
    detail: string;
    action?: { label: string; onClick: () => void; busy: boolean };
    extra?: { ok: boolean; message: string } | null;
  };

  const INTEGRATIONS: Integration[] = [
    {
      label: "Supabase",
      icon: Database,
      desc: "Cloud media storage for uploads.",
      configured: supabaseOn,
      detail: supabaseOn
        ? "Keys detected — uploads use the “media” bucket."
        : "Add VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY to enable cloud storage.",
      action: supabaseOn
        ? {
            label: testingSupa ? "Testing…" : "Test connection",
            onClick: handleTestSupabase,
            busy: testingSupa,
          }
        : undefined,
      extra: supaStatus,
    },
    {
      label: "Stripe",
      icon: CheckCircle2,
      desc: "USD billing for the Pro plan.",
      configured: serverKeys?.stripe ?? false,
      detail: "Add STRIPE_SECRET_KEY, STRIPE_PRO_PRICE_ID, STRIPE_WEBHOOK_SECRET in the project keys.",
    },
    {
      label: "Paystack",
      icon: CheckCircle2,
      desc: "NGN billing for Nigerian teams.",
      configured: serverKeys?.paystack ?? false,
      detail: "Add PAYSTACK_SECRET_KEY (and optional PAYSTACK_PLAN_CODE) in the project keys.",
    },
    {
      label: "Gemini",
      icon: Sparkles,
      desc: "AI sermon summaries and verse explanations.",
      configured: serverKeys?.gemini ?? false,
      detail: "Add GEMINI_API_KEY from Google AI Studio to power AI features in Scripture.",
    },
    {
      label: "Bible API",
      icon: BookOpenText,
      desc: "Full passage text by reference (KJV default).",
      configured: serverKeys?.bibleApi ?? false,
      detail: "Add BIBLE_API_KEY from scripture.api.bible to look up any passage.",
    },
  ];

  const APPS = [
    { app: "obs", label: "OBS Studio", icon: MonitorPlay },
    { app: "easyworship", label: "EasyWorship 7", icon: Radio },
    { app: "pewbeam", label: "PewBeam", icon: Wand2 },
  ] as const;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Profile, integration keys, and saved desktop connections."
      />

      {/* First-run setup checklist */}
      <SetupChecklist />

      {/* Profile */}
      <section className="rounded-xl border border-border bg-card p-5">
        <p className="tech-label mb-4">Operator profile</p>
        <div className="grid max-w-xl gap-3 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="tech-label">Display name</span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={currentUser?.name ?? "Media operator"}
            />
          </label>
          <label className="space-y-1.5">
            <span className="tech-label">Email</span>
            <Input value={currentUser?.email ?? ""} disabled className="opacity-60" />
          </label>
        </div>
        <Button
          size="sm"
          className="mt-4 cursor-pointer gap-1.5"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Save profile
        </Button>
      </section>

      {/* Integrations */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="tech-label">Integrations</p>
          <Button
            size="sm"
            variant="outline"
            className="cursor-pointer gap-1.5"
            onClick={() => navigate("/dashboard/keys")}
          >
            <KeyRound className="h-3.5 w-3.5" /> Manage API keys
          </Button>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {INTEGRATIONS.map((it) => (
            <div key={it.label} className="rounded-lg border border-border bg-secondary/30 p-4">
              <div className="flex items-center gap-2.5">
                <it.icon className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-semibold tracking-tight text-foreground">
                  {it.label}
                </p>
                {serverKeys === null ? (
                  <span className="ml-auto flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Detecting
                  </span>
                ) : (
                  <span
                    className={cn(
                      "ml-auto flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.18em]",
                      it.configured ? "text-emerald-400" : "text-muted-foreground",
                    )}
                  >
                    {it.configured ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <CircleDashed className="h-3 w-3" />
                    )}
                    {it.configured ? "Ready" : "Keys needed"}
                  </span>
                )}
              </div>
              <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
                {it.detail}
              </p>
              {it.action && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 cursor-pointer gap-1.5"
                  onClick={it.action.onClick}
                  disabled={it.action.busy}
                >
                  {it.action.busy && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  <Cable className="h-3 w-3" /> {it.action.label}
                </Button>
              )}
              {it.extra && (
                <p
                  className={cn(
                    "mt-2 text-[11px]",
                    it.extra.ok ? "text-emerald-400" : "text-destructive",
                  )}
                >
                  {it.extra.message}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Desktop integrations */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="tech-label mb-1">Desktop integrations</p>
            <p className="text-[11px] leading-4 text-muted-foreground">
              OBS Studio connects directly over its documented WebSocket API.
              EasyWorship 7 and PewBeam have no public web API — they are driven
              through the Alpha Worship Bridge local connector on the media PC.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="cursor-pointer gap-1.5"
            onClick={() => navigate("/dashboard/integrations")}
          >
            <Cable className="h-3.5 w-3.5" /> Manage integrations
          </Button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {APPS.map((a) => {
            const conn = connByApp.get(a.app);
            const configured = conn
              ? a.app === "obs"
                ? Boolean(conn.host)
                : Boolean(conn.url)
              : false;
            return (
              <button
                key={a.app}
                onClick={() => navigate("/dashboard/integrations")}
                className="cursor-pointer rounded-lg border border-border bg-secondary/30 p-4 text-left transition-colors hover:border-accent/40"
              >
                <div className="flex items-center gap-2.5">
                  <a.icon className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-semibold tracking-tight text-foreground">
                    {a.label}
                  </p>
                  <span
                    className={cn(
                      "ml-auto font-mono text-[9px] uppercase tracking-[0.18em]",
                      configured ? "text-emerald-400" : "text-muted-foreground",
                    )}
                  >
                    {configured ? "Configured" : "Not connected"}
                  </span>
                </div>
                <p className="mt-2 truncate font-mono text-[11px] text-muted-foreground">
                  {conn
                    ? a.app === "obs"
                      ? `${conn.host}:${conn.port}`
                      : conn.url
                    : a.app === "obs"
                      ? "WebSocket · port 4455"
                      : "Requires local connector"}
                </p>
                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                  {conn?.lastConnectedAt
                    ? `Last seen ${formatDateTime(conn.lastConnectedAt)}`
                    : "—"}
                </p>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
