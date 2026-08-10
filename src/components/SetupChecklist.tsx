import { api } from "@/convex/_generated/api";
import { useAction, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getSupabaseEnv } from "@/lib/supabase";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  Loader2,
  PartyPopper,
} from "lucide-react";

type ItemStatus = "done" | "partial" | "missing";

type CheckItem = {
  id: string;
  label: string;
  desc: string;
  status: ItemStatus;
  /** Exact names of what's missing — shown as mono chips. */
  missing: string[];
  target: "/dashboard/keys" | "/dashboard/integrations";
  actionLabel: string;
};

type ServerKeys = {
  stripe: boolean;
  paystack: boolean;
  gemini: boolean;
  bibleApi: boolean;
  cryptKeySet: boolean;
};

function ItemRow({ item, onGo }: { item: CheckItem; onGo: () => void }) {
  const done = item.status === "done";
  const partial = item.status === "partial";
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3 py-2.5",
        done
          ? "border-emerald-400/20 bg-emerald-400/5"
          : "border-border bg-secondary/30",
      )}
    >
      {done ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
      ) : partial ? (
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
      ) : (
        <CircleDashed className="h-4 w-4 shrink-0 text-muted-foreground/60" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p
            className={cn(
              "text-xs font-semibold tracking-tight",
              done ? "text-emerald-400" : "text-foreground",
            )}
          >
            {item.label}
          </p>
          {!done && item.missing.length > 0 && (
            <span className="flex flex-wrap items-center gap-1">
              {item.missing.map((m) => (
                <span
                  key={m}
                  className="rounded border border-border bg-card px-1.5 py-px font-mono text-[9px] text-muted-foreground"
                >
                  {m}
                </span>
              ))}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[10px] leading-3.5 text-muted-foreground">
          {item.desc}
        </p>
      </div>
      {!done && (
        <Button
          size="sm"
          variant={partial ? "outline" : "secondary"}
          className="shrink-0 cursor-pointer gap-1"
          onClick={onGo}
        >
          {item.actionLabel} <ArrowRight className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

/**
 * First-run checklist: flags exactly which service keys and desktop
 * connections are still missing. Reads presence from the encrypted key store,
 * the platform env keys, and the saved connection config — never values.
 */
export function SetupChecklist() {
  const navigate = useNavigate();
  const stored = useQuery(api.apiKeys.list);
  const connections = useQuery(api.connections.list);
  const integrationStatus = useAction(api.integrations.status);
  const [serverKeys, setServerKeys] = useState<ServerKeys | null>(null);

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

  const storedByKey = new Map((stored ?? []).map((s) => [s.key, s]));
  const envConfigured: Record<string, boolean> = {
    GEMINI_API_KEY: Boolean(serverKeys?.gemini),
    BIBLE_API_KEY: Boolean(serverKeys?.bibleApi),
    STRIPE_SECRET_KEY: Boolean(serverKeys?.stripe),
    STRIPE_PRO_PRICE_ID: Boolean(serverKeys?.stripe),
    STRIPE_WEBHOOK_SECRET: Boolean(serverKeys?.stripe),
    PAYSTACK_SECRET_KEY: Boolean(serverKeys?.paystack),
    VITE_SUPABASE_URL: Boolean(getSupabaseEnv()),
    VITE_SUPABASE_ANON_KEY: Boolean(getSupabaseEnv()),
  };

  const isSet = (key: string) =>
    Boolean(storedByKey.get(key)?.configured) || envConfigured[key];

  const keysState = (
    keys: string[],
  ): { status: ItemStatus; missing: string[] } => {
    const missing = keys.filter((k) => !isSet(k));
    if (missing.length === 0) return { status: "done", missing };
    if (missing.length < keys.length) return { status: "partial", missing };
    return { status: "missing", missing };
  };

  const anyUnencrypted = (stored ?? []).some(
    (s) => s.configured && !s.encrypted,
  );
  const anyEncrypted = (stored ?? []).some(
    (s) => s.configured && s.encrypted,
  );
  const encryptionDone =
    Boolean(serverKeys?.cryptKeySet) || (anyEncrypted && !anyUnencrypted);
  const encryptionPartial = !encryptionDone && anyUnencrypted;

  const obsConn = (connections ?? []).find((c) => c.app === "obs");
  const pewbeamConn = (connections ?? []).find(
    (c) => c.app === "pewbeam" && c.url,
  );
  const ewConn = (connections ?? []).find(
    (c) => c.app === "easyworship" && c.url,
  );

  const loading =
    serverKeys === null || stored === undefined || connections === undefined;

  if (loading) {
    return (
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2.5 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <p className="tech-label">Checking setup…</p>
        </div>
      </section>
    );
  }

  const keysItem = (
    id: string,
    label: string,
    desc: string,
    keys: string[],
  ): CheckItem => {
    const { status, missing } = keysState(keys);
    return {
      id,
      label,
      desc,
      status,
      missing,
      target: "/dashboard/keys",
      actionLabel: missing.length > 1 ? "Add keys" : "Add key",
    };
  };

  const requiredItems: CheckItem[] = [
    keysItem(
      "gemini",
      "Gemini",
      "AI sermon summaries & verse explanations",
      ["GEMINI_API_KEY"],
    ),
    keysItem(
      "bible",
      "Bible API",
      "Scripture verse lookup for the display",
      ["BIBLE_API_KEY"],
    ),
    keysItem("stripe", "Stripe", "Pro plan billing (USD)", [
      "STRIPE_SECRET_KEY",
      "STRIPE_PRO_PRICE_ID",
      "STRIPE_WEBHOOK_SECRET",
    ]),
    keysItem("paystack", "Paystack", "Pro plan billing (NGN)", [
      "PAYSTACK_SECRET_KEY",
    ]),
    keysItem("supabase", "Supabase", "Cloud media storage for uploads", [
      "VITE_SUPABASE_URL",
      "VITE_SUPABASE_ANON_KEY",
    ]),
    {
      id: "encryption",
      label: "Secret encryption",
      desc: "Encrypts saved keys & connection secrets at rest (AES-256-GCM)",
      status: encryptionPartial ? "partial" : encryptionDone ? "done" : "missing",
      missing: encryptionDone ? [] : ["INTEGRATION_CRYPT_KEY"],
      target: "/dashboard/keys",
      actionLabel: "View guidance",
    },
    {
      id: "obs",
      label: "OBS Studio",
      desc: "Live stream engine over the WebSocket API",
      status: obsConn?.host ? "done" : "missing",
      missing: obsConn?.host ? [] : ["OBS WebSocket host"],
      target: "/dashboard/integrations",
      actionLabel: "Connect",
    },
  ];

  const optionalItems: CheckItem[] = [
    {
      id: "pewbeam",
      label: "PewBeam",
      desc: "Projection display via the local connector",
      status: pewbeamConn ? "done" : "missing",
      missing: [],
      target: "/dashboard/integrations",
      actionLabel: "Configure",
    },
    {
      id: "easyworship",
      label: "EasyWorship 7",
      desc: "Presentation software via the local connector",
      status: ewConn ? "done" : "missing",
      missing: [],
      target: "/dashboard/integrations",
      actionLabel: "Configure",
    },
  ];

  const doneCount = requiredItems.filter((i) => i.status === "done").length;
  const allDone = doneCount === requiredItems.length;

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="tech-label mb-1">
            {allDone ? "Setup complete" : "Setup checklist"}
          </p>
          <p className="text-[11px] leading-4 text-muted-foreground">
            {allDone
              ? "Every required key and connection is configured."
              : `${doneCount} of ${requiredItems.length} required steps complete — see exactly what's missing below.`}
          </p>
        </div>
        {allDone ? (
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-emerald-400">
            <PartyPopper className="h-3 w-3" /> All systems ready
          </span>
        ) : (
          <span className="rounded-full border border-border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
            {doneCount}/{requiredItems.length} complete
          </span>
        )}
      </div>

      {!allDone && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-emerald-400 transition-all duration-500"
            style={{ width: `${(doneCount / requiredItems.length) * 100}%` }}
          />
        </div>
      )}

      <div className="mt-4 space-y-2">
        {requiredItems.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            onGo={() => navigate(item.target)}
          />
        ))}
      </div>

      <p className="mb-2 mt-5 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
        Optional
      </p>
      <div className="space-y-2">
        {optionalItems.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            onGo={() => navigate(item.target)}
          />
        ))}
      </div>
    </section>
  );
}
