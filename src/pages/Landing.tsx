import { motion } from "framer-motion";
import { Link } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { CoverArt } from "@/components/cover-art";
import { formatUSD } from "@/lib/format";
import { PRO_PRICE_NGN, PRO_PRICE_USD, TRIAL_DAYS } from "@/convex/pricing";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  BookOpenText,
  Check,
  Database,
  Download,
  Heart,
  Library,
  ListOrdered,
  Mic,
  MonitorPlay,
  Radio,
  ScanText,
  Sparkles,
  UploadCloud,
  Wand2,
  Zap,
} from "lucide-react";

const DEMO_ITEMS = [
  { title: "Way Maker", type: "song", artist: "Sinach", accent: "violet", downloads: 148, likes: 36 },
  { title: "John 3:16", type: "scripture", reference: "John 3:16", accent: "rose", downloads: 210, likes: 58 },
  { title: "Sunrise Motion Loop", type: "background", accent: "amber", downloads: 203, likes: 41 },
  { title: "Sermon Title Card", type: "template", accent: "indigo", downloads: 88, likes: 22 },
] as const;

const FEATURES = [
  {
    icon: MonitorPlay,
    title: "One console for the whole booth",
    body: "Drive your broadcast engine, presentation software, and verse display from a single operator screen over your local network — no alt-tabbing between windows.",
  },
  {
    icon: ScanText,
    title: "Sermon verse detection",
    body: "Paste a transcript and every Bible reference is detected instantly, with KJV text ready to project in a single click.",
  },
  {
    icon: Library,
    title: "Shared content catalog",
    body: "Songs, scripture, backgrounds, and templates — browse, search, and download what your team has already built.",
  },
  {
    icon: UploadCloud,
    title: "Upload your own media",
    body: "Publish your team's content to the library with cover art and tags, then wire it into any service.",
  },
  {
    icon: ListOrdered,
    title: "Run-of-show services",
    body: "Plan the order of worship item by item, then step through it live while pushing each slide to your apps.",
  },
  {
    icon: Sparkles,
    title: "Billing that just works",
    body: "30 days of full Pro free, then $8.76/month through Stripe or Paystack. Cancel anytime, no phone calls.",
  },
];

const PIPELINE = [
  { step: "01", label: "Capture", icon: Mic, body: "Sermon audio and transcripts come in from the sound booth." },
  { step: "02", label: "Detect", icon: ScanText, body: "Verses are recognized and matched to the library automatically." },
  { step: "03", label: "Drive", icon: Zap, body: "The operator steps the run-of-show and pushes slides to every app." },
  { step: "04", label: "Stream", icon: Radio, body: "Your broadcast engine carries the full stream — scenes, lower-thirds, and NDI layers." },
] as const;

function fadeUp(delay: number) {
  return {
    initial: { opacity: 0, y: 18 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-80px" },
    transition: { duration: 0.55, delay, ease: [0.21, 0.47, 0.32, 0.98] as const },
  };
}

export default function Landing() {
  const { isAuthenticated, isLoading } = useAuth();
  const ctaHref = isAuthenticated ? "/dashboard" : "/auth";
  const ctaLabel = isLoading
    ? "Loading…"
    : isAuthenticated
      ? "Open console"
      : "Start your 30-day free trial";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="cursor-pointer">
            <Wordmark compact />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {[
              ["Features", "#features"],
              ["Pipeline", "#pipeline"],
              ["Catalog", "#catalog"],
              ["Pricing", "#pricing"],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="cursor-pointer rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              className="hidden cursor-pointer sm:inline-flex"
            >
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button asChild className="cursor-pointer gap-1.5">
              <Link to={ctaHref}>
                {ctaLabel} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="glow-violet relative overflow-hidden pt-32 pb-20 sm:pt-40">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <motion.div {...fadeUp(0)}>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
                <Zap className="h-3 w-3" /> For church media teams
              </span>
              <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                Run the whole{" "}
                <span className="bg-gradient-to-r from-primary via-fuchsia-400 to-accent bg-clip-text text-transparent">
                  service
                </span>{" "}
                from one console.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
                One operator screen for your whole media stack — projection
                software, verse displays, and the broadcast engine — projecting
                lyrics and scripture, transcribing sermon verses, and
                controlling the live stream.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="cursor-pointer gap-2">
                  <Link to={ctaHref}>
                    {ctaLabel} <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="cursor-pointer">
                  <a href="#pricing">See pricing</a>
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-400" /> {TRIAL_DAYS}-day free trial
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-400" /> {formatUSD(PRO_PRICE_USD)}/mo after
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-400" /> No credit card to start
                </span>
              </div>
            </motion.div>

            {/* Terminal mockup */}
            <motion.div {...fadeUp(0.15)}>
              <div className="rounded-2xl border border-border bg-card/80 p-2 backdrop-blur">
                <div className="flex items-center gap-1.5 px-3 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                  <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    booth://control-room · Alpha Worship One
                  </span>
                </div>
                <div className="rounded-xl border border-border bg-background p-4">
                  <div className="flex items-center justify-between">
                    <p className="tech-label">Broadcast transport</p>
                    <span className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-400">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                      live
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {["Countdown", "Worship", "Sermon", "Lower third", "Offering", "Stream"].map(
                      (s, i) => (
                        <div
                          key={s}
                          className={cn(
                            "rounded-lg border px-3 py-2.5 text-[11px] font-medium",
                            i === 2
                              ? "border-primary/60 bg-primary/15 text-primary"
                              : "border-border bg-secondary text-muted-foreground",
                          )}
                        >
                          {s}
                          {i === 2 && (
                            <span className="mt-1 block font-mono text-[8px] uppercase tracking-[0.2em] text-primary/80">
                              On air
                            </span>
                          )}
                        </div>
                      ),
                    )}
                  </div>
                  <div className="mt-3 space-y-1.5 font-mono text-[10px] leading-4">
                    <p className="text-muted-foreground">
                      <span className="text-primary">$</span> verses --detect
                      "transcript.txt"
                    </p>
                    <p className="text-emerald-400/90">
                      ✓ John 3:16 · Philippians 4:13 · Isaiah 40:31
                    </p>
                    <p className="text-muted-foreground">
                      <span className="text-primary">$</span> stream --start --scene
                      "Sermon"
                    </p>
                    <p className="text-accent">▶ broadcasting to YouTube · 1080p60</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Integration strip — rendered statically so it is always crisp */}
          <div className="mt-16">
            <p className="text-center font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Integrates with the tools your team already runs
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {[
                { icon: MonitorPlay, label: "Broadcast engine" },
                { icon: Radio, label: "Presentation software" },
                { icon: Wand2, label: "Verse display" },
              ].map((t) => (
                <span
                  key={t.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-primary"
                >
                  <t.icon className="h-3.5 w-3.5" /> {t.label}
                </span>
              ))}
              {["NDI", "Convex", "Supabase", "Stripe", "Paystack"].map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-border bg-card px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border/60 py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <motion.div {...fadeUp(0)} className="max-w-2xl">
            <p className="tech-label">Capabilities</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Built for the booth,{" "}
              <span className="text-primary">not against it</span>.
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Everything a media operator touches during a service — projection,
              transcription, and broadcast — orchestrated with the precision of a
              developer tool.
            </p>
          </motion.div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                {...fadeUp(0.05 * i)}
                className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-secondary">
                  <f.icon className="h-4 w-4 text-primary transition-transform group-hover:scale-110" />
                </div>
                <h3 className="mt-4 text-sm font-bold tracking-tight text-foreground">
                  {f.title}
                </h3>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{f.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pipeline */}
      <section id="pipeline" className="border-t border-border/60 py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <motion.div {...fadeUp(0)} className="max-w-2xl">
            <p className="tech-label">How it works</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              From pulpit to pixels.
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              A four-stage pipeline that keeps the message moving from the
              speaker's voice to the screens and the stream.
            </p>
          </motion.div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PIPELINE.map((p, i) => (
              <motion.div
                key={p.step}
                {...fadeUp(0.06 * i)}
                className="relative rounded-xl border border-border bg-card p-5"
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">
                  {p.step}
                </span>
                <p.icon className="mt-4 h-5 w-5 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-bold tracking-tight text-foreground">
                  {p.label}
                </h3>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{p.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Catalog preview */}
      <section id="catalog" className="border-t border-border/60 py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <motion.div {...fadeUp(0)} className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="tech-label">Content library</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                A catalog your team actually uses.
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Songs, scripture, backgrounds, and templates — seeded with
                starter content the moment you sign in.
              </p>
            </div>
            <Button asChild variant="outline" className="cursor-pointer gap-1.5">
              <Link to={isAuthenticated ? "/dashboard/catalog" : "/auth"}>
                Browse the catalog <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
          <div className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {DEMO_ITEMS.map((item, i) => (
              <motion.div
                key={item.title}
                {...fadeUp(0.05 * i)}
                className="cursor-pointer overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/40"
              >
                <CoverArt
                  item={{
                    title: item.title,
                    coverUrl: undefined,
                    coverStorageId: undefined,
                    accent: item.accent,
                    type: item.type,
                  }}
                  className="aspect-[4/3] w-full"
                />
                <div className="p-3">
                  <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                    {item.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {"artist" in item && item.artist
                      ? item.artist
                      : "reference" in item && item.reference
                        ? item.reference
                        : "Template"}
                  </p>
                  <div className="mt-2 flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Download className="h-3 w-3" /> {item.downloads}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="h-3 w-3" /> {item.likes}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-border/60 py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <motion.div {...fadeUp(0)} className="mx-auto max-w-2xl text-center">
            <p className="tech-label">Pricing</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              One plan. A month to decide.
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Every new workspace gets {TRIAL_DAYS} days of full Pro — no credit
              card required. After the trial, Pro is{" "}
              {formatUSD(PRO_PRICE_USD)}/month, or{" "}
              {new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(PRO_PRICE_NGN)}
              /month via Paystack.
            </p>
          </motion.div>
          <div className="mx-auto mt-10 grid max-w-4xl gap-4 lg:grid-cols-2">
            <motion.div
              {...fadeUp(0.05)}
              className="rounded-xl border border-border bg-card p-6"
            >
              <p className="tech-label">Starter</p>
              <p className="mt-2 text-3xl font-bold tracking-tight">
                $0<span className="text-sm font-normal text-muted-foreground"> /mo</span>
              </p>
              <ul className="mt-5 space-y-2.5">
                {[
                  "Personal dashboard & catalog",
                  "30-day Pro trial on signup",
                  "Community content access",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-foreground/85">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /> {f}
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" className="mt-6 w-full cursor-pointer">
                <Link to="/auth">Get started</Link>
              </Button>
            </motion.div>
            <motion.div
              {...fadeUp(0.1)}
              className="relative rounded-xl border border-primary/50 bg-primary/10 p-6"
            >
              <span className="absolute -top-3 left-6 rounded-full border border-primary/60 bg-card px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-primary">
                Recommended
              </span>
              <p className="tech-label">Pro</p>
              <p className="mt-2 text-3xl font-bold tracking-tight">
                {formatUSD(PRO_PRICE_USD)}
                <span className="text-sm font-normal text-muted-foreground"> /mo</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                After a {TRIAL_DAYS}-day free trial · Stripe or Paystack
              </p>
              <ul className="mt-5 space-y-2.5">
                {[
                  "Live broadcast control room",
                  "Projection + verse display bridges",
                  "Unlimited services & uploads",
                  "Verse detection & transcription",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-foreground/90">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {f}
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-6 w-full cursor-pointer gap-1.5">
                <Link to={ctaHref}>
                  Start free trial <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/60 py-20">
        <motion.div
          {...fadeUp(0)}
          className="glow-violet mx-auto w-full max-w-6xl px-4 sm:px-6"
        >
          <div className="rounded-2xl border border-primary/40 bg-card/60 p-10 text-center">
            <BookOpenText className="mx-auto h-6 w-6 text-primary" />
            <h2 className="mx-auto mt-4 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
              Next Sunday deserves a better console.
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
              Set up takes minutes, and the first {TRIAL_DAYS} days are on us.
              Your media team will thank you.
            </p>
            <Button asChild size="lg" className="mt-7 cursor-pointer gap-2">
              <Link to={ctaHref}>
                {ctaLabel} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <Wordmark compact />
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            © {new Date().getFullYear()} Alpha Worship One · Made for media teams
          </p>
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Database className="h-3 w-3" /> Supabase
            </span>
            <span className="flex items-center gap-1">
              <Wand2 className="h-3 w-3" /> Stripe · Paystack
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
