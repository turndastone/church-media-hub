import { api } from "@/convex/_generated/api";
import { useAction, useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { getSupabaseEnv, testSupabaseConnection, useSupabaseEnv } from "@/lib/supabase";
import {
  AlertTriangle,
  BookOpenText,
  Cable,
  CheckCircle2,
  CircleDashed,
  CreditCard,
  Database,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Save,
  Sparkles,
  Trash2,
  Wallet,
} from "lucide-react";

type FieldDef = {
  key: string;
  label: string;
  hint?: string;
  secret?: boolean;
  placeholder?: string;
};

type SectionDef = {
  id: string;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  fields: FieldDef[];
  test?: "gemini" | "bible" | "supabase";
};

const SECTIONS: SectionDef[] = [
  {
    id: "gemini",
    title: "Gemini",
    desc: "AI sermon summaries and verse explanations.",
    icon: Sparkles,
    fields: [
      { key: "GEMINI_API_KEY", label: "API key", secret: true, placeholder: "AIza…" },
    ],
    test: "gemini",
  },
  {
    id: "bible",
    title: "Bible API",
    desc: "Full passage text by reference (API.Bible).",
    icon: BookOpenText,
    fields: [
      { key: "BIBLE_API_KEY", label: "API key", secret: true, placeholder: "sk_…" },
      {
        key: "BIBLE_ID",
        label: "Bible ID",
        hint: "Optional — overrides the default KJV translation.",
        placeholder: "de4e12af7f28f599-02",
      },
    ],
    test: "bible",
  },
  {
    id: "stripe",
    title: "Stripe",
    desc: "USD billing for the Pro plan.",
    icon: CreditCard,
    fields: [
      { key: "STRIPE_SECRET_KEY", label: "Secret key", secret: true, placeholder: "sk_live_…" },
      { key: "STRIPE_PRO_PRICE_ID", label: "Pro price ID", placeholder: "price_…" },
      {
        key: "STRIPE_WEBHOOK_SECRET",
        label: "Webhook secret",
        secret: true,
        placeholder: "whsec_…",
        hint: "Verifies events on /stripe-webhook.",
      },
    ],
  },
  {
    id: "paystack",
    title: "Paystack",
    desc: "NGN billing for Nigerian teams.",
    icon: Wallet,
    fields: [
      { key: "PAYSTACK_SECRET_KEY", label: "Secret key", secret: true, placeholder: "sk_live_…" },
      {
        key: "PAYSTACK_PLAN_CODE",
        label: "Plan code",
        hint: "Optional — only if you use a Paystack plan.",
        placeholder: "PLN_…",
      },
    ],
  },
  {
    id: "supabase",
    title: "Supabase",
    desc: "Cloud media storage for uploads.",
    icon: Database,
    fields: [
      { key: "VITE_SUPABASE_URL", label: "Project URL", placeholder: "https://xxxx.supabase.co" },
      {
        key: "VITE_SUPABASE_ANON_KEY",
        label: "Anon key",
        secret: true,
        hint: "Client-safe by design — used for storage uploads.",
      },
    ],
    test: "supabase",
  },
];

type KeyStatus = "stored" | "env" | "none";

function KeyField({
  field,
  value,
  onChange,
  status,
  encrypted,
  onRemove,
}: {
  field: FieldDef;
  value: string;
  onChange: (v: string) => void;
  status: KeyStatus;
  encrypted: boolean;
  onRemove: () => void;
}) {
  const [show, setShow] = useState(false);

  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="tech-label">{field.label}</span>
        <span
          className={cn(
            "flex items-center gap-1 font-mono text-[8px] uppercase tracking-[0.18em]",
            status === "stored"
              ? encrypted
                ? "text-emerald-400"
                : "text-amber-400"
              : status === "env"
                ? "text-primary"
                : "text-muted-foreground",
          )}
        >
          <span
            className={cn(
              "h-1 w-1 rounded-full",
              status === "stored"
                ? encrypted
                  ? "bg-emerald-400"
                  : "bg-amber-400"
                : status === "env"
                  ? "bg-primary"
                  : "bg-muted-foreground/40",
            )}
          />
          {status === "stored"
            ? encrypted
              ? "Saved"
              : "Saved · not encrypted"
            : status === "env"
              ? "Set in env"
              : "Not set"}
        </span>
        {status === "stored" && (
          <button
            onClick={onRemove}
            className="ml-auto cursor-pointer rounded p-1 text-muted-foreground/60 transition-colors hover:text-destructive"
            title={`Remove ${field.key}`}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
      <div className="relative mt-1.5">
        <Input
          type={field.secret && !show ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="pr-9 font-mono text-xs"
          autoComplete="off"
          spellCheck={false}
        />
        {field.secret && (
          <button
            onClick={() => setShow((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground/70 transition-colors hover:text-foreground"
            title={show ? "Hide value" : "Show value"}
          >
            {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
      {field.hint && <p className="mt-1 text-[10px] leading-3.5 text-muted-foreground">{field.hint}</p>}
    </div>
  );
}

function KeySection({
  section,
  stored,
  envConfigured,
  supaEnv,
}: {
  section: SectionDef;
  stored: { key: string; configured: boolean; encrypted: boolean; updatedAt: number | null }[] | undefined;
  envConfigured: Record<string, boolean>;
  supaEnv: ReturnType<typeof useSupabaseEnv>;
}) {
  const setKey = useMutation(api.apiKeys.set);
  const removeKey = useMutation(api.apiKeys.remove);
  const explainVerse = useAction(api.gemini.explainVerse);
  const lookupPassage = useAction(api.bible.lookupPassage);

  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const statusFor = (key: string): { kind: KeyStatus; encrypted: boolean; updatedAt: number | null } => {
    const s = stored?.find((x) => x.key === key);
    if (s?.configured) return { kind: "stored", encrypted: s.encrypted, updatedAt: s.updatedAt };
    if (envConfigured[key]) return { kind: "env", encrypted: true, updatedAt: null };
    return { kind: "none", encrypted: false, updatedAt: null };
  };

  const anyStored = section.fields.some((f) => statusFor(f.key).kind === "stored");
  const anyEnv = section.fields.some((f) => envConfigured[f.key]);
  const sectionStatus: KeyStatus = anyStored ? "stored" : anyEnv ? "env" : "none";
  const dirty = section.fields.some((f) => (values[f.key] ?? "").trim() !== "");
  const lastSaved = Math.max(
    0,
    ...section.fields.map((f) => statusFor(f.key).updatedAt ?? 0),
  );

  const handleSave = async () => {
    setSaving(true);
    let unencrypted = false;
    try {
      for (const f of section.fields) {
        const v = (values[f.key] ?? "").trim();
        if (!v) continue;
        const res = await setKey({ key: f.key, value: v });
        if (!res.encrypted) unencrypted = true;
      }
      setValues({});
      toast.success(`${section.title} keys saved`);
      if (unencrypted) {
        toast.warning(
          "INTEGRATION_CRYPT_KEY isn't set — these keys are stored without encryption.",
        );
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setResult(null);
    try {
      if (section.test === "gemini") {
        const r = await explainVerse({ reference: "John 3:16" });
        setResult({
          ok: Boolean(r.explanation),
          message: r.explanation
            ? "Gemini responded — key works."
            : "Gemini returned an empty response.",
        });
      } else if (section.test === "bible") {
        const r = await lookupPassage({ book: "John", chapter: 3, verse: 16, version: "KJV" });
        setResult({
          ok: Boolean(r.text),
          message: r.text ? "Fetched John 3:16 (KJV) — key works." : "Empty response.",
        });
      } else if (section.test === "supabase") {
        const r = await testSupabaseConnection(supaEnv);
        setResult({ ok: r.ok, message: r.message });
      }
    } catch (e) {
      setResult({ ok: false, message: (e as Error).message });
    } finally {
      setTesting(false);
    }
  };

  const handleRemoveAll = async () => {
    try {
      for (const f of section.fields) {
        if (statusFor(f.key).kind === "stored") await removeKey({ key: f.key });
      }
      setValues({});
      toast.success(`${section.title} keys removed`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleRemoveOne = async (key: string) => {
    try {
      await removeKey({ key });
      toast.success(`${key} removed`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary/50">
          <section.icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold tracking-tight text-foreground">{section.title}</p>
            <span
              className={cn(
                "flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.18em]",
                sectionStatus === "stored"
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                  : sectionStatus === "env"
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground",
              )}
            >
              {sectionStatus === "stored" ? (
                <CheckCircle2 className="h-2.5 w-2.5" />
              ) : sectionStatus === "env" ? (
                <KeyRound className="h-2.5 w-2.5" />
              ) : (
                <CircleDashed className="h-2.5 w-2.5" />
              )}
              {sectionStatus === "stored"
                ? "Saved in app"
                : sectionStatus === "env"
                  ? "Set in env"
                  : "Not set"}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{section.desc}</p>
        </div>
      </div>

      <div className="mt-4 space-y-3.5">
        {section.fields.map((f) => {
          const st = statusFor(f.key);
          return (
            <KeyField
              key={f.key}
              field={f}
              value={values[f.key] ?? ""}
              onChange={(v) => setValues((prev) => ({ ...prev, [f.key]: v }))}
              status={st.kind}
              encrypted={st.encrypted}
              onRemove={() => handleRemoveOne(f.key)}
            />
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          className="cursor-pointer gap-1.5"
          onClick={handleSave}
          disabled={saving || !dirty}
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save keys
        </Button>
        {section.test && (
          <Button
            size="sm"
            variant="outline"
            className="cursor-pointer gap-1.5"
            onClick={handleTest}
            disabled={testing || sectionStatus === "none"}
          >
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Cable className="h-3.5 w-3.5" />}
            Test
          </Button>
        )}
        {anyStored && (
          <Button
            size="sm"
            variant="ghost"
            className="cursor-pointer gap-1.5 text-destructive hover:bg-destructive/10"
            onClick={handleRemoveAll}
          >
            <Trash2 className="h-3.5 w-3.5" /> Remove all
          </Button>
        )}
        {lastSaved > 0 && (
          <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
            Last saved {formatDateTime(lastSaved)}
          </span>
        )}
      </div>

      {result && (
        <p
          className={cn(
            "mt-3 rounded-lg border px-3 py-2 text-[11px] leading-4",
            result.ok
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
              : "border-destructive/30 bg-destructive/10 text-destructive",
          )}
        >
          {result.message}
        </p>
      )}
    </section>
  );
}

export default function ApiKeys() {
  const stored = useQuery(api.apiKeys.list);
  const integrationStatus = useAction(api.integrations.status);
  const supaEnv = useSupabaseEnv();
  const [serverKeys, setServerKeys] = useState<{
    stripe: boolean;
    paystack: boolean;
    gemini: boolean;
    bibleApi: boolean;
    cryptKeySet: boolean;
  } | null>(null);

  useEffect(() => {
    let active = true;
    integrationStatus()
      .then((s) => {
        if (active) setServerKeys(s);
      })
      .catch(() => {
        if (active) {
          setServerKeys({
            stripe: false,
            paystack: false,
            gemini: false,
            bibleApi: false,
            cryptKeySet: false,
          });
        }
      });
    return () => {
      active = false;
    };
  }, [integrationStatus]);

  const envConfigured: Record<string, boolean> = {
    GEMINI_API_KEY: Boolean(serverKeys?.gemini),
    BIBLE_API_KEY: Boolean(serverKeys?.bibleApi),
    BIBLE_ID: Boolean(serverKeys?.bibleApi),
    STRIPE_SECRET_KEY: Boolean(serverKeys?.stripe),
    STRIPE_PRO_PRICE_ID: Boolean(serverKeys?.stripe),
    STRIPE_WEBHOOK_SECRET: Boolean(serverKeys?.stripe),
    PAYSTACK_SECRET_KEY: Boolean(serverKeys?.paystack),
    PAYSTACK_PLAN_CODE: Boolean(serverKeys?.paystack),
    VITE_SUPABASE_URL: Boolean(getSupabaseEnv()),
    VITE_SUPABASE_ANON_KEY: Boolean(getSupabaseEnv()),
  };

  const anyUnencrypted = (stored ?? []).some((s) => s.configured && !s.encrypted);
  const cryptKeySet = Boolean(serverKeys?.cryptKeySet);
  const banner =
    serverKeys === null && stored === undefined
      ? { kind: "idle" as const, text: "Checking encryption state…" }
      : !cryptKeySet
        ? {
            kind: "warn" as const,
            text: "INTEGRATION_CRYPT_KEY is not set — keys saved here will be stored without encryption. Add it in the platform Keys tab (32-byte hex or base64) to encrypt everything at rest.",
          }
        : anyUnencrypted
          ? {
              kind: "warn" as const,
              text: "Some keys were saved before encryption was enabled. Re-save them to encrypt at rest.",
            }
          : {
              kind: "ok" as const,
              text: "Secrets are encrypted at rest with AES-256-GCM. Values are never shown or returned by list queries.",
            };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Workspace"
        title="API Keys"
        description="Add the service keys that power scripture lookups, AI summaries, cloud storage, and billing. Keys saved here take priority; the platform Keys tab works as a fallback."
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <Lock className="h-3 w-3" /> Encrypted at rest
          </span>
        }
      />

      <div
        className={cn(
          "flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[12px] leading-5",
          banner.kind === "ok"
            ? "border-emerald-400/30 bg-emerald-400/5 text-emerald-400"
            : banner.kind === "warn"
              ? "border-amber-400/30 bg-amber-400/5 text-amber-400"
              : "border-border bg-card text-muted-foreground",
        )}
      >
        {banner.kind === "ok" ? (
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        ) : banner.kind === "warn" ? (
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        ) : (
          <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin" />
        )}
        {banner.text}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {SECTIONS.map((s) => (
          <KeySection
            key={s.id}
            section={s}
            stored={stored}
            envConfigured={envConfigured}
            supaEnv={supaEnv}
          />
        ))}

        {/* Security note */}
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary/50">
              <Lock className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold tracking-tight text-foreground">How keys are stored</p>
              <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
                Encryption, priority, and where the same secrets appear elsewhere.
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-2.5 text-[11px] leading-4 text-muted-foreground">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
              Values are encrypted with AES-256-GCM when INTEGRATION_CRYPT_KEY is set, and list
              queries never return them — only presence flags.
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
              In-app keys take priority at runtime; anything set in the platform Keys tab still
              works as a fallback.
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
              Desktop connection secrets (OBS password, connector tokens) share the same
              encryption key and live in the Integrations page.
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
              Stripe and Paystack also need their webhook endpoints pointed at your deployment
              (/stripe-webhook, /paystack-webhook) for payments to activate subscriptions.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
