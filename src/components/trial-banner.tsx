import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { TRIAL_DAYS } from "@/convex/pricing";

export function TrialBanner() {
  const sub = useQuery(api.subscriptions.mySubscription);

  if (!sub || sub.access === "pro") return null;

  if (sub.trialExpired) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-accent/30 bg-accent/10 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <div>
            <p className="text-sm font-semibold tracking-tight text-foreground">
              Your 30-day Pro trial has ended
            </p>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
              Keep full access to the control room, catalog, and transcription
              for $8.76/month — cancel anytime.
            </p>
          </div>
        </div>
        <Button asChild className="cursor-pointer gap-1.5">
          <Link to="/dashboard/billing">
            Upgrade to Pro <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    );
  }

  return null;
}

export function TrialPill() {
  const sub = useQuery(api.subscriptions.mySubscription);
  if (!sub) return null;
  if (sub.access === "pro" && !sub.trialActive) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        Pro active
      </span>
    );
  }
  if (sub.trialActive) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        Trial · {sub.daysLeft}/{TRIAL_DAYS}d
      </span>
    );
  }
  return null;
}
