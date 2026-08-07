import { api } from "@/convex/_generated/api";
import { useAction, useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { formatDate, formatNGN, formatUSD } from "@/lib/format";
import {
  PRO_PRICE_NGN,
  PRO_PRICE_USD,
  TRIAL_DAYS,
} from "@/convex/pricing";
import { cn } from "@/lib/utils";
import {
  Check,
  CreditCard,
  Loader2,
  PartyPopper,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

const FREE_FEATURES = [
  "Personal dashboard & catalog",
  "30-day Pro trial on signup",
  "Community content",
  "Basic transcription",
];

const PRO_FEATURES = [
  "Live broadcast control room (scenes, stream, record)",
  "Projection + verse display bridges",
  "Unlimited service run-of-shows",
  "Unlimited uploads & verse detection",
  "Priority admin support",
];

const REQUIRED_KEYS = [
  { key: "STRIPE_SECRET_KEY", note: "Stripe checkout" },
  { key: "STRIPE_PRO_PRICE_ID", note: "Your $8.76/mo recurring price" },
  { key: "STRIPE_WEBHOOK_SECRET", note: "/stripe-webhook verification" },
  { key: "PAYSTACK_SECRET_KEY", note: "Paystack checkout + webhook" },
  { key: "PAYSTACK_PLAN_CODE", note: "Optional — recurring Paystack plan" },
];

export default function Billing() {
  const sub = useQuery(api.subscriptions.mySubscription);
  const ensureTrial = useMutation(api.subscriptions.ensureTrial);
  const createCheckout = useAction(api.payments.createCheckoutSession);
  const cancel = useAction(api.payments.cancelSubscription);

  const [loading, setLoading] = useState<string | null>(null);

  const startTrial = async () => {
    setLoading("trial");
    try {
      await ensureTrial();
      toast.success(`Your ${TRIAL_DAYS}-day Pro trial has started`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const checkout = async (provider: "stripe" | "paystack") => {
    setLoading(provider);
    try {
      const { url } = await createCheckout({
        provider,
        trialDays: sub?.trialExpired || sub?.access === "free" ? TRIAL_DAYS : 0,
        successUrl: `${window.location.origin}/dashboard/billing?checkout=success`,
        cancelUrl: `${window.location.origin}/dashboard/billing`,
      });
      window.location.href = url;
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Cancel your subscription? You keep Pro access until the period ends.")) return;
    setLoading("cancel");
    try {
      await cancel();
      toast.success("Subscription canceled");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const trialProgress =
    sub?.trialEndsAt && sub.trialActive
      ? Math.min(100, Math.max(0, ((sub.trialEndsAt - (Date.now() - TRIAL_DAYS * 86400000)) / (TRIAL_DAYS * 86400000)) * 100))
      : 0;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Plan & billing"
        title="Billing"
        description="Start with a full 30-day Pro trial. After that, Pro is $8.76/month — billed through Stripe or Paystack."
      />

      {/* Current plan */}
      <div
        className={cn(
          "rounded-xl border p-5",
          sub?.access === "pro"
            ? "border-primary/40 bg-primary/10"
            : "border-border bg-card",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-secondary">
              {sub?.access === "pro" ? (
                <Sparkles className="h-5 w-5 text-primary" />
              ) : (
                <CreditCard className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight text-foreground">
                {sub?.access === "pro" ? "Pro plan" : "Free plan"}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {sub?.trialActive
                  ? `Trialing · ${sub.daysLeft} days left`
                  : sub?.status === "active"
                    ? `Active · renews ${sub.currentPeriodEnd ? formatDate(sub.currentPeriodEnd) : "—"}`
                    : sub?.trialExpired
                      ? "Trial ended — upgrade to keep Pro"
                      : "Pro trial available"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {sub?.access === "pro" && !sub.trialActive && (
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={handleCancel}
                disabled={loading === "cancel"}
              >
                {loading === "cancel" && (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                )}
                Cancel subscription
              </Button>
            )}
            {(sub?.access === "free" || !sub) && (
              <Button
                size="sm"
                className="cursor-pointer gap-1.5"
                onClick={startTrial}
                disabled={loading === "trial"}
              >
                {loading === "trial" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <PartyPopper className="h-3.5 w-3.5" />
                )}
                Start free trial
              </Button>
            )}
          </div>
        </div>
        {sub?.trialActive && (
          <div className="mt-4">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
                style={{ width: `${trialProgress}%` }}
              />
            </div>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Trial ends {sub.trialEndsAt ? formatDate(sub.trialEndsAt) : "—"}
            </p>
          </div>
        )}
      </div>

      {/* Plans */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Free */}
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="tech-label">Starter</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            $0
            <span className="text-sm font-normal text-muted-foreground"> /mo</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            For exploring the console after the trial ends.
          </p>
          <ul className="mt-5 space-y-2.5">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-foreground/85">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Pro */}
        <div className="relative rounded-xl border border-primary/50 bg-primary/10 p-6">
          <span className="absolute -top-3 left-6 rounded-full border border-primary/60 bg-card px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-primary">
            Recommended
          </span>
          <p className="tech-label">Pro</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            {formatUSD(PRO_PRICE_USD)}
            <span className="text-sm font-normal text-muted-foreground"> /mo</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            or {formatNGN(PRO_PRICE_NGN)}/mo via Paystack · after a{" "}
            {TRIAL_DAYS}-day free trial
          </p>
          <ul className="mt-5 space-y-2.5">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-foreground/90">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {f}
              </li>
            ))}
          </ul>

          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <button
              onClick={() => checkout("stripe")}
              disabled={loading !== null}
              className="group cursor-pointer rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/50"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold tracking-tight text-foreground">
                  Stripe
                </p>
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {formatUSD(PRO_PRICE_USD)}/mo · USD
              </p>
              <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">
                International cards & Apple/Google Pay.
              </p>
            </button>
            <button
              onClick={() => checkout("paystack")}
              disabled={loading !== null}
              className="group cursor-pointer rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/50"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold tracking-tight text-foreground">
                  Paystack
                </p>
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {formatNGN(PRO_PRICE_NGN)}/mo · NGN
              </p>
              <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">
                Naira cards, bank transfer & USSD.
              </p>
            </button>
          </div>
          <p className="mt-3 text-[11px] leading-4 text-muted-foreground">
            {loading === "stripe" || loading === "paystack" ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" /> Opening secure checkout…
              </span>
            ) : (
              "Secure checkout handled by the provider. Cancel anytime."
            )}
          </p>
        </div>
      </div>

      {/* Setup keys */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm font-semibold tracking-tight text-foreground">
          Going live with billing
        </p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Add these keys in the project Keys/API keys panel to activate real
          checkout. Until then, the app simulates the flow end-to-end.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {REQUIRED_KEYS.map((k) => (
            <div
              key={k.key}
              className="rounded-lg border border-border bg-secondary/40 px-3 py-2.5"
            >
              <p className="font-mono text-[11px] font-semibold text-foreground">
                {k.key}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{k.note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
