import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Cookie, ShieldCheck } from "lucide-react";

const STORAGE_KEY = "rccg-cookie-notice-v1";

/** True when this visitor has already dismissed the notice. */
export function isCookieNoticeAcknowledged(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "dismissed";
  } catch {
    // Storage blocked (private mode / sandbox) — treat as a fresh visit.
    return false;
  }
}

/** Remembers the dismissal so the notice never returns for this visitor. */
export function acknowledgeCookieNotice(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, "dismissed");
  } catch {
    // Nothing to persist — the notice simply returns on the next visit.
  }
}

/** The banner itself — kept presentational so it can be rendered in isolation. */
export function CookieNoticeCard({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 rounded-2xl border border-primary/30 bg-card/95 p-4 backdrop-blur-md sm:flex-row sm:items-center sm:gap-5 sm:p-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
        <Cookie className="h-5 w-5" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold tracking-tight text-foreground">
          A quick note on cookies
        </p>
        <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
          This site uses essential cookies and local storage only — to keep you
          signed in, remember your preferences, and keep your session secure. We
          use no advertising or tracking cookies. Read our{" "}
          <Link
            to="/privacy"
            className="cursor-pointer font-semibold text-primary underline decoration-primary/40 underline-offset-2 transition-colors hover:decoration-primary"
          >
            Privacy Policy
          </Link>{" "}
          for the full detail.
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="outline"
          size="lg"
          asChild
          className="h-11 flex-1 cursor-pointer gap-1.5 sm:h-10 sm:flex-none"
        >
          <Link to="/privacy">
            <ShieldCheck className="h-4 w-4" /> Privacy Policy
          </Link>
        </Button>
        <Button
          size="lg"
          onClick={onDismiss}
          className="h-11 flex-1 cursor-pointer sm:h-10 sm:flex-none"
        >
          Got it
        </Button>
      </div>
    </div>
  );
}

/** Dismissible cookie notice. Stays dismissed once acknowledged. */
export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isCookieNoticeAcknowledged()) return;
    const timer = window.setTimeout(() => setVisible(true), 1100);
    return () => window.clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setVisible(false);
    acknowledgeCookieNotice();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="dialog"
          aria-modal="false"
          aria-label="Cookie notice"
          aria-live="polite"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 28 }}
          transition={{ duration: 0.45, ease: [0.21, 0.47, 0.32, 0.98] }}
          // Right gutter on ≥sm keeps the floating chat launcher (bottom-right) clear.
          className="fixed inset-x-0 bottom-0 z-50 p-3 sm:px-20 sm:pb-5 lg:px-24"
        >
          <CookieNoticeCard onDismiss={dismiss} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
