import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

import { useAuth } from "@/hooks/use-auth";
import { LogoMark } from "@/components/wordmark";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Loader2,
  Lock,
  Mail,
  Quote,
  Radio,
  ShieldCheck,
  Upload,
  UserX,
} from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

interface AuthProps {
  redirectAfterAuth?: string;
}

const CODE_LENGTH = 6;

const MEMBER_BENEFITS = [
  {
    icon: Quote,
    title: "Share your testimony",
    body: "Tell the family what God has done, once an admin reviews it.",
  },
  {
    icon: CalendarDays,
    title: "Follow the programmes",
    body: "Service times, vigils, and special gatherings in one place.",
  },
  {
    icon: Radio,
    title: "Watch and serve live",
    body: "Join the livestream and help run services from the console.",
  },
  {
    icon: Upload,
    title: "Media team tools",
    body: "Songs, scripture, and slides for the worship team.",
  },
];

const VERSE =
  "“Call unto me, and I will answer thee, and shew thee great and mighty things.”";

/** Keeps members on an in-app path after login; rejects off-site redirects. */
export function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/dashboard",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );
  const [step, setStep] = useState<"signIn" | { email: string }>("signIn");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      setStep({ email: formData.get("email") as string });
      setOtp("");
      setIsLoading(false);
    } catch (error) {
      console.error("Email sign-in error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to send verification code. Please try again.",
      );
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      navigate(redirect);
    } catch (error) {
      console.error("OTP verification error:", error);
      setError("That code didn't match. Please check your email and try again.");
      setIsLoading(false);
      setOtp("");
    }
  };

  const handleResend = async () => {
    if (step === "signIn") return;
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("email", step.email);
      await signIn("email-otp", formData);
      setOtp("");
    } catch (error) {
      console.error("Resend error:", error);
      setError("We couldn't resend the code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn("anonymous");
      navigate(redirect);
    } catch (error) {
      console.error("Guest login error:", error);
      setError(
        `Failed to continue as guest: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="glow-blue relative min-h-screen overflow-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[56rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
      />

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="relative z-10 mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex cursor-pointer items-center gap-2.5">
          <LogoMark className="h-9 w-9" />
          <div className="leading-none">
            <p className="text-[15px] font-bold tracking-tight">
              Solution<span className="text-primary"> Ambassadors</span>
            </p>
            <p className="mt-1 hidden font-mono text-[8px] uppercase tracking-[0.24em] text-muted-foreground sm:block">
              RCCG Parish · Dobro
            </p>
          </div>
        </Link>
        <Button asChild variant="ghost" size="sm" className="cursor-pointer gap-1.5">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" /> Back to website
          </Link>
        </Button>
      </header>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <main className="relative z-10 mx-auto grid w-full max-w-6xl gap-10 px-4 pb-16 pt-4 sm:px-6 lg:grid-cols-[1.05fr_minmax(0,420px)] lg:items-center lg:gap-16 lg:pb-24">
        {/* Member welcome panel (desktop) */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="hidden lg:block"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
            <Lock className="h-3.5 w-3.5" /> Members area
          </span>
          <h1 className="mt-6 font-display text-4xl font-bold leading-[1.1] tracking-tight">
            Welcome home,
            <br />
            <span className="bg-gradient-to-r from-primary via-sky-300 to-accent bg-clip-text text-transparent">
              solution ambassador.
            </span>
          </h1>
          <p className="mt-5 max-w-lg text-[15px] leading-7 text-muted-foreground">
            Sign in to reach everything reserved for members of the parish — your
            testimonies, the service schedule, the livestream, and the media
            team's tools.
          </p>
          <p className="mt-6 max-w-md font-display text-[17px] italic leading-8 text-accent/90">
            {VERSE}
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Jeremiah 33:3
          </p>

          <div className="mt-10 grid max-w-xl gap-3 sm:grid-cols-2">
            {MEMBER_BENEFITS.map((b) => (
              <div
                key={b.title}
                className="rounded-xl border border-border bg-card/60 p-4"
              >
                <b.icon className="h-4 w-4 text-primary" />
                <p className="mt-2.5 text-[13px] font-bold tracking-tight">
                  {b.title}
                </p>
                <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                  {b.body}
                </p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Sign-in card */}
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="mx-auto w-full max-w-[420px] lg:mx-0"
        >
          <Card className="border border-border bg-card/90 pb-0 backdrop-blur">
            <AnimatePresence mode="wait" initial={false}>
              {step === "signIn" ? (
                <motion.div
                  key="email"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.25 }}
                >
                  <CardHeader className="text-center">
                    <div className="mb-4 mt-5 flex justify-center">
                      <LogoMark className="h-14 w-14" />
                    </div>
                    <CardTitle className="text-xl tracking-tight">
                      Member sign in
                    </CardTitle>
                    <CardDescription>
                      Enter your email and we'll send you a one-time code. No
                      password to remember.
                    </CardDescription>
                  </CardHeader>
                  <form onSubmit={handleEmailSubmit}>
                    <CardContent>
                      <label className="tech-label" htmlFor="member-email">
                        Email address
                      </label>
                      <div className="relative mt-1.5 flex items-center gap-2">
                        <div className="relative flex-1">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="member-email"
                            name="email"
                            placeholder="name@example.com"
                            type="email"
                            autoComplete="email"
                            className="h-11 pl-9"
                            disabled={isLoading}
                            required
                          />
                        </div>
                        <Button
                          type="submit"
                          size="icon-lg"
                          disabled={isLoading}
                          aria-label="Send login code"
                          className="cursor-pointer"
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ArrowRight className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {error && (
                        <p className="mt-2 text-sm text-destructive">{error}</p>
                      )}

                      <div className="mt-5">
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-border" />
                          </div>
                          <div className="relative flex justify-center text-[10px] uppercase">
                            <span className="bg-card px-2 font-mono tracking-[0.2em] text-muted-foreground">
                              or
                            </span>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          className="mt-4 h-11 w-full cursor-pointer"
                          onClick={handleGuestLogin}
                          disabled={isLoading}
                        >
                          <UserX className="mr-2 h-4 w-4" />
                          Continue as Guest
                        </Button>
                        <p className="mt-2 text-center text-[11px] leading-4 text-muted-foreground">
                          Guests can browse the site; members can share
                          testimonies and use the media tools.
                        </p>
                      </div>

                      <p className="mt-6 text-center text-[11px] leading-5 text-muted-foreground">
                        By continuing you agree to our{" "}
                        <Link
                          to="/terms"
                          className="cursor-pointer text-primary hover:underline"
                        >
                          Terms of Use
                        </Link>{" "}
                        and{" "}
                        <Link
                          to="/privacy"
                          className="cursor-pointer text-primary hover:underline"
                        >
                          Privacy Policy
                        </Link>
                        .
                      </p>
                    </CardContent>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="code"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.25 }}
                >
                  <CardHeader className="text-center">
                    <div className="mb-3 mt-5 flex justify-center">
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
                        <ShieldCheck className="h-6 w-6" />
                      </span>
                    </div>
                    <CardTitle className="text-xl tracking-tight">
                      Enter your code
                    </CardTitle>
                    <CardDescription>
                      We sent a {CODE_LENGTH}-digit code to{" "}
                      <span className="font-semibold text-foreground">
                        {step.email}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <form onSubmit={handleOtpSubmit}>
                    <CardContent className="pb-4">
                      <input type="hidden" name="email" value={step.email} />
                      <input type="hidden" name="code" value={otp} />

                      <div className="flex justify-center">
                        <InputOTP
                          value={otp}
                          onChange={setOtp}
                          maxLength={CODE_LENGTH}
                          disabled={isLoading}
                          onKeyDown={(e) => {
                            if (
                              e.key === "Enter" &&
                              otp.length === CODE_LENGTH &&
                              !isLoading
                            ) {
                              const form = (e.target as HTMLElement).closest("form");
                              if (form) form.requestSubmit();
                            }
                          }}
                        >
                          <InputOTPGroup>
                            {Array.from({ length: CODE_LENGTH }).map((_, index) => (
                              <InputOTPSlot key={index} index={index} />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>
                      </div>

                      {error && (
                        <p className="mt-3 text-center text-sm text-destructive">
                          {error}
                        </p>
                      )}

                      <p className="mt-4 text-center text-[11px] leading-4 text-muted-foreground">
                        Didn't receive a code?{" "}
                        <button
                          type="button"
                          onClick={handleResend}
                          disabled={isLoading}
                          className="cursor-pointer font-semibold text-primary hover:underline disabled:opacity-60"
                        >
                          Resend code
                        </button>
                      </p>
                    </CardContent>
                    <CardFooter className="flex-col gap-2">
                      <Button
                        type="submit"
                        className="h-11 w-full cursor-pointer"
                        disabled={isLoading || otp.length !== CODE_LENGTH}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Verifying…
                          </>
                        ) : (
                          <>
                            Verify & enter
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setError(null);
                          setOtp("");
                          setStep("signIn");
                        }}
                        disabled={isLoading}
                        className="w-full cursor-pointer"
                      >
                        Use a different email
                      </Button>
                    </CardFooter>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="rounded-b-lg border-t border-border bg-secondary/40 px-6 py-4 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              RCCG Solution Ambassadors · Dobro · Ghana
            </div>
          </Card>
        </motion.div>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/10 bg-card/40 py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            © {new Date().getFullYear()} RCCG Solution Ambassadors Dobro
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px]">
            <Link
              to="/terms"
              className="cursor-pointer text-muted-foreground transition-colors hover:text-primary"
            >
              Terms of Use
            </Link>
            <Link
              to="/privacy"
              className="cursor-pointer text-muted-foreground transition-colors hover:text-primary"
            >
              Privacy Policy
            </Link>
            <Link
              to="/"
              className="cursor-pointer text-muted-foreground transition-colors hover:text-primary"
            >
              Back to website
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
