import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogoMark, Wordmark } from "@/components/wordmark";
import { ChurchChat } from "@/components/ChurchChat";
import { cn } from "@/lib/utils";
import {
  isProgramToday,
  parseStartMinutes,
  sortByStartTime,
} from "@/lib/churchSchedule";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Church,
  Clock,
  Facebook,
  Gem,
  Globe,
  HeartHandshake,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Moon,
  Music2,
  Navigation,
  Phone,
  Sparkles,
  Sunrise,
  Twitter,
  Users,
  Youtube,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Category = "daily" | "weekly" | "monthly" | "provincial";

const CATEGORY_META: Record<
  Category,
  { label: string; icon: LucideIcon; blurb: string }
> = {
  daily: { label: "Daily", icon: Sunrise, blurb: "Every-day encounters with God" },
  weekly: { label: "Weekly", icon: CalendarDays, blurb: "The rhythm of parish life" },
  monthly: { label: "Monthly", icon: Moon, blurb: "Special gatherings & thanksgiving" },
  provincial: { label: "Provincial", icon: Globe, blurb: "Across the province, together" },
};

const SOCIAL_ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  facebook: { icon: Facebook, label: "Facebook" },
  youtube: { icon: Youtube, label: "YouTube" },
  instagram: { icon: Instagram, label: "Instagram" },
  x: { icon: Twitter, label: "X (Twitter)" },
  tiktok: { icon: Music2, label: "TikTok" },
  whatsapp: { icon: MessageCircle, label: "WhatsApp" },
};

const PILLARS = [
  {
    icon: HeartHandshake,
    title: "Fervent Prayer",
    body: "We stand in the gap through daily intercession, vigils, and monthly fasting — believing God for answers.",
  },
  {
    icon: BookOpen,
    title: "Sound Teaching",
    body: "The undiluted Word of God through Bible study, Sunday School, and Digging Deep sessions.",
  },
  {
    icon: Gem,
    title: "Practical Solutions",
    body: "We equip every member to carry godly, practical solutions into their homes, workplaces, and nation.",
  },
];

const DEFAULT_NAME = "RCCG Solution Ambassador";
const DEFAULT_TAGLINE = "A Parish of the Redeemed Christian Church of God";
const DEFAULT_VERSE =
  "Call unto me, and I will answer thee, and shew thee great and mighty things, which thou knowest not. — Jeremiah 33:3";

function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 18 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { duration: 0.55, delay, ease: [0.21, 0.47, 0.32, 0.98] as const },
  };
}

export default function Landing() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const info = useQuery(api.church.getInfo);
  const programs = useQuery(api.church.listPrograms);
  const ensureSeed = useMutation(api.church.ensureSeed);
  const [activeTab, setActiveTab] = useState<Category>("weekly");

  useEffect(() => {
    ensureSeed().catch(() => undefined);
  }, [ensureSeed]);

  const name = info?.name ?? DEFAULT_NAME;
  const tagline = info?.tagline ?? DEFAULT_TAGLINE;
  const description =
    info?.description ??
    "RCCG Solution Ambassador is a vibrant, Christ-centred parish of the Redeemed Christian Church of God, raising kingdom ambassadors who carry practical, godly solutions to their homes, workplaces, schools, and communities.";
  const verse = info?.verse ?? DEFAULT_VERSE;
  const address = info?.address ?? "12 Solution Way, Off Redemption Avenue, Lagos, Nigeria";
  const phones = info?.phones ?? [];
  const emails = info?.emails ?? [];
  const socials = info?.socials ?? [];
  const allPrograms = programs ?? [];

  const grouped = (cat: Category) =>
    allPrograms
      .filter((p) => p.category === cat)
      .sort((a, b) => a.order - b.order);
  const counts = (Object.keys(CATEGORY_META) as Category[]).map((cat) => ({
    cat,
    count: grouped(cat).length,
  }));

  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  const sundayService = allPrograms.find(
    (p) => p.category === "weekly" && p.title.toLowerCase().includes("sunday worship"),
  );

  // Programs happening today, sorted by start time. Upcoming ones first so the
  // next gathering sits at the top, with earlier ones below labelled as such.
  const todayNow = new Date();
  const todaysPrograms = sortByStartTime(
    allPrograms.filter((p) => isProgramToday(p.day, todayNow)),
  );
  const nowMinutes = todayNow.getHours() * 60 + todayNow.getMinutes();
  const upcoming = todaysPrograms.filter(
    (p) => (parseStartMinutes(p.time) ?? 0) >= nowMinutes,
  );
  const passed = todaysPrograms.filter(
    (p) => (parseStartMinutes(p.time) ?? 0) < nowMinutes,
  );
  const displayToday = [...upcoming, ...passed];
  const nextUp = upcoming[0] ?? null;
  const todayLabel = todayNow.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const navLinks: [string, string][] = [
    ["Today", "#today"],
    ["About", "#about"],
    ["Programs", "#programs"],
    ["Visit us", "#visit"],
    ["Contact", "#contact"],
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="#top" className="flex cursor-pointer items-center gap-2.5">
            <LogoMark className="h-9 w-9" />
            <div className="leading-none">
              <p className="text-[15px] font-bold tracking-tight">
                Solution<span className="text-primary"> Ambassador</span>
              </p>
              <p className="mt-1 hidden font-mono text-[8px] uppercase tracking-[0.24em] text-muted-foreground sm:block">
                RCCG Parish
              </p>
            </div>
          </a>
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map(([label, href]) => (
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
              <Link to={isAuthenticated ? "/dashboard/church" : "/auth"}>
                {authLoading ? "Loading…" : isAuthenticated ? "Church admin" : "Sign in"}
              </Link>
            </Button>
            <Button asChild className="cursor-pointer gap-1.5">
              <a href="#programs">
                Join us <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section id="top" className="glow-blue relative overflow-hidden pt-32 pb-20 sm:pt-40">
        {/* decorative light rays */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[52rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
        />
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <motion.div {...fadeUp(0)} className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
              <Church className="h-3.5 w-3.5" /> {tagline}
            </span>
            <h1 className="mt-6 font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
              Welcome to{" "}
              <span className="bg-gradient-to-r from-primary via-sky-300 to-accent bg-clip-text text-transparent">
                {name}
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              We are raising kingdom ambassadors who carry practical, godly
              solutions to their homes, workplaces, schools, and communities —
              through fervent prayer, sound teaching, and purposeful worship.
            </p>
            <p className="mx-auto mt-6 max-w-xl font-display text-lg italic leading-8 text-accent/90">
              “{verse.replace(/ — .*$/, "")}”
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {verse.split("—")[1]?.trim()}
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="cursor-pointer gap-2">
                <a href="#programs">
                  Explore our programs <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="cursor-pointer gap-2">
                <a href="#visit">
                  <MapPin className="h-4 w-4" /> Plan your visit
                </a>
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {counts.map(({ cat, count }) => {
                const meta = CATEGORY_META[cat];
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setActiveTab(cat);
                      document
                        .getElementById("programs")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="group flex cursor-pointer items-center gap-2 text-left"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 transition-colors group-hover:border-primary/50 group-hover:bg-primary/10">
                      <meta.icon className="h-3.5 w-3.5 text-primary" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold leading-4">
                        {count} {meta.label}
                      </span>
                      <span className="block font-mono text-[8px] uppercase tracking-[0.18em] text-muted-foreground">
                        programs
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Today ──────────────────────────────────────────────────────── */}
      <section id="today" className="glow-blue border-t border-white/10 py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <motion.div {...fadeUp(0)} className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
              <Clock className="h-3.5 w-3.5" /> Today · {todayLabel}
            </span>
            <h2 className="mt-5 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {todaysPrograms.length > 0 ? (
                <>What&apos;s happening today?</>
              ) : (
                <>A quiet day at {name}</>
              )}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-7 text-muted-foreground">
              {todaysPrograms.length > 0
                ? `A snapshot of today's gatherings at ${name} — check the times, and come with an expectant heart.`
                : `No services are scheduled for ${todayLabel.split(",")[0]} — but there is always something coming up.`}
            </p>
          </motion.div>

          {displayToday.length === 0 ? (
            <motion.div
              {...fadeUp(0.05)}
              className="mx-auto mt-10 max-w-xl rounded-2xl border border-dashed border-white/15 bg-card/50 p-10 text-center"
            >
              <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground/60" />
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                Explore our daily, weekly, monthly, and provincial programs
                below — or ask the AI welcome assistant for the full schedule.
              </p>
              <Button asChild size="sm" className="mt-5 cursor-pointer gap-1.5">
                <a href="#programs">
                  See all programs <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </motion.div>
          ) : (
            <>
              <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {displayToday.map((p, i) => {
                  const minutes = parseStartMinutes(p.time);
                  const isNext = nextUp?._id === p._id;
                  const isPassed = minutes !== null && minutes < nowMinutes;
                  return (
                    <motion.div
                      key={p._id}
                      {...fadeUp(0.05 * i)}
                      className={cn(
                        "group relative flex flex-col rounded-xl border p-5 transition-colors",
                        isNext
                          ? "border-accent/60 bg-accent/10"
                          : "border-white/10 bg-card hover:border-primary/40",
                      )}
                    >
                      {isNext && (
                        <span className="absolute -top-2.5 left-4 rounded-full bg-accent px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-accent-foreground shadow-md shadow-black/30">
                          Next up
                        </span>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                          <Clock className="h-4 w-4" />
                        </span>
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em]",
                            isPassed
                              ? "border-muted-foreground/30 text-muted-foreground"
                              : "border-accent/30 bg-accent/10 text-accent",
                          )}
                        >
                          {isPassed ? "Earlier today" : "Today"}
                        </span>
                      </div>
                      <h3 className="mt-4 text-[15px] font-bold tracking-tight">
                        {p.title}
                      </h3>
                      <p className="mt-1.5 flex-1 text-[13px] leading-6 text-muted-foreground">
                        {p.description}
                      </p>
                      <div className="mt-4 space-y-1.5 border-t border-white/10 pt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        <p className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-primary" /> {p.time}
                        </p>
                        {p.venue && (
                          <p className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-primary" /> {p.venue}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              {upcoming.length === 0 && (
                <p className="mt-6 text-center text-xs text-muted-foreground">
                  Today&apos;s programs have wrapped up — but they repeat, and
                  there is always a gathering to look forward to below.
                </p>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── About ───────────────────────────────────────────────────────── */}
      <section id="about" className="border-t border-white/10 py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="grid items-start gap-12 lg:grid-cols-2">
            <motion.div {...fadeUp(0)}>
              <p className="tech-label">Who we are</p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                A church with{" "}
                <span className="text-primary">solutions for every season</span>.
              </h2>
              <p className="mt-5 text-[15px] leading-7 text-muted-foreground">
                {description}
              </p>
              <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
                Whether you are joining us for the first time or you have walked
                with us for years, you are family here. Come as you are —
                we would love to meet you.
              </p>
              <div className="mt-7 flex flex-wrap gap-2">
                {["Sunday Worship", "Bible Study", "Prayer & Deliverance", "Youth Fellowship"].map(
                  (tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary"
                    >
                      {tag}
                    </span>
                  ),
                )}
              </div>
            </motion.div>
            <div className="grid gap-3 sm:grid-cols-1">
              {PILLARS.map((p, i) => (
                <motion.div
                  key={p.title}
                  {...fadeUp(0.08 * i)}
                  className="group flex gap-4 rounded-xl border border-white/10 bg-card p-5 transition-colors hover:border-primary/40"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 text-primary">
                    <p.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold tracking-tight">{p.title}</h3>
                    <p className="mt-1.5 text-[13px] leading-6 text-muted-foreground">
                      {p.body}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Programs ────────────────────────────────────────────────────── */}
      <section id="programs" className="border-t border-white/10 py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <motion.div {...fadeUp(0)} className="mx-auto max-w-2xl text-center">
            <p className="tech-label">Programs & services</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Daily, weekly, monthly & provincial.
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
              There is always something happening at {name}. Find a service that
              fits your season, and come with an expectant heart.
            </p>
          </motion.div>

          {/* Tabs */}
          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {(Object.keys(CATEGORY_META) as Category[]).map((cat) => {
              const meta = CATEGORY_META[cat];
              const isActive = activeTab === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveTab(cat)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors",
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-white/10 bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  <meta.icon className="h-4 w-4" />
                  {meta.label}
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-px font-mono text-[9px]",
                      isActive ? "bg-white/20 text-white" : "bg-white/5 text-muted-foreground",
                    )}
                  >
                    {grouped(cat).length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active category blurb */}
          <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {CATEGORY_META[activeTab].blurb}
          </p>

          {/* Cards */}
          {!programs ? (
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-44 animate-pulse rounded-xl border border-white/10 bg-card"
                />
              ))}
            </div>
          ) : grouped(activeTab).length === 0 ? (
            <div className="mx-auto mt-8 max-w-md rounded-xl border border-dashed border-white/15 bg-card/50 p-10 text-center text-sm text-muted-foreground">
              No {CATEGORY_META[activeTab].label.toLowerCase()} programs listed
              right now — check back soon!
            </div>
          ) : (
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {grouped(activeTab).map((p, i) => (
                <motion.div
                  key={p._id}
                  {...fadeUp(0.05 * i)}
                  className="group relative flex flex-col rounded-xl border border-white/10 bg-card p-5 transition-colors hover:border-primary/40"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      {(() => {
                        const Icon = CATEGORY_META[activeTab].icon;
                        return <Icon className="h-4 w-4" />;
                      })()}
                    </span>
                    <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-accent">
                      {p.day}
                    </span>
                  </div>
                  <h3 className="mt-4 text-[15px] font-bold tracking-tight">
                    {p.title}
                  </h3>
                  <p className="mt-1.5 flex-1 text-[13px] leading-6 text-muted-foreground">
                    {p.description}
                  </p>
                  <div className="mt-4 space-y-1.5 border-t border-white/10 pt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-primary" /> {p.time}
                    </p>
                    {p.venue && (
                      <p className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-primary" /> {p.venue}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Visit / Location ────────────────────────────────────────────── */}
      <section id="visit" className="border-t border-white/10 py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="grid items-stretch gap-6 lg:grid-cols-2">
            <motion.div
              {...fadeUp(0)}
              className="glow-blue flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-card p-8"
            >
              <div>
                <p className="tech-label">Find us</p>
                <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                  We would love to host you.
                </h2>
                <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
                  {name} is located at{" "}
                  <span className="font-semibold text-foreground">{address}</span>.
                  We are easy to find and always ready with a warm welcome.
                </p>
                <div className="mt-6 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-primary">
                      <MapPin className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{address}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Main auditorium · ample parking · all welcome
                      </p>
                    </div>
                  </div>
                  {sundayService && (
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-primary">
                        <CalendarDays className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold">
                          Sunday Worship Service
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {sundayService.day}, {sundayService.time}
                          {sundayService.venue ? ` · ${sundayService.venue}` : ""}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild className="cursor-pointer gap-2">
                  <a href={mapsHref} target="_blank" rel="noopener noreferrer">
                    <Navigation className="h-4 w-4" /> Get directions
                  </a>
                </Button>
                <Button asChild variant="outline" className="cursor-pointer gap-2">
                  <a href="#contact">
                    <Phone className="h-4 w-4" /> Contact us
                  </a>
                </Button>
              </div>
            </motion.div>

            {/* Social strip */}
            <motion.div
              {...fadeUp(0.1)}
              className="flex flex-col justify-between rounded-2xl border border-white/10 bg-card p-8"
            >
              <div>
                <p className="tech-label">Stay connected</p>
                <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                  Follow us everywhere.
                </h2>
                <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
                  Catch every service, testimony, and announcement on our social
                  channels. Stream with us on Facebook and YouTube, and follow
                  the parish across all platforms.
                </p>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {socials.length === 0 ? (
                  <p className="col-span-full rounded-lg border border-dashed border-white/15 p-5 text-center text-xs text-muted-foreground">
                    Social links coming soon.
                  </p>
                ) : (
                  socials.map((s) => {
                    const meta = SOCIAL_ICONS[s.platform] ?? {
                      icon: Globe,
                      label: s.platform,
                    };
                    return (
                      <a
                        key={`${s.platform}-${s.url}`}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-white/10 bg-secondary/40 p-4 text-center transition-colors hover:border-primary/50"
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary transition-transform group-hover:scale-110">
                          <meta.icon className="h-4.5 w-4.5" />
                        </span>
                        <span className="text-xs font-semibold">{meta.label}</span>
                      </a>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Contact ─────────────────────────────────────────────────────── */}
      <section id="contact" className="border-t border-white/10 py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <motion.div {...fadeUp(0)} className="mx-auto max-w-2xl text-center">
            <p className="tech-label">Contact us</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Reach out — we are here for you.
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
              Questions, prayer requests, or partnership? Call, email, or message
              us — a member of the parish team will get back to you.
            </p>
          </motion.div>
          <div className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-2">
            <motion.div
              {...fadeUp(0.05)}
              className="rounded-xl border border-white/10 bg-card p-6"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Phone className="h-4.5 w-4.5" />
              </span>
              <h3 className="mt-4 text-sm font-bold tracking-tight">Phone numbers</h3>
              <div className="mt-2 space-y-1.5">
                {(phones.length ? phones : ["+234 800 000 0000"]).map((ph) => (
                  <a
                    key={ph}
                    href={`tel:${ph.replace(/[^+\d]/g, "")}`}
                    className="block cursor-pointer text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {ph}
                  </a>
                ))}
              </div>
            </motion.div>
            <motion.div
              {...fadeUp(0.1)}
              className="rounded-xl border border-white/10 bg-card p-6"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Mail className="h-4.5 w-4.5" />
              </span>
              <h3 className="mt-4 text-sm font-bold tracking-tight">Email us</h3>
              <div className="mt-2 space-y-1.5">
                {(emails.length ? emails : ["info@rccgsolutionambassador.org"]).map((em) => (
                  <a
                    key={em}
                    href={`mailto:${em}`}
                    className="block cursor-pointer text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {em}
                  </a>
                ))}
              </div>
            </motion.div>
            <motion.div
              {...fadeUp(0.15)}
              className="rounded-xl border border-white/10 bg-card p-6 sm:col-span-2"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Sparkles className="h-4.5 w-4.5" />
              </span>
              <h3 className="mt-4 text-sm font-bold tracking-tight">
                Talk to our AI welcome assistant
              </h3>
              <p className="mt-2 max-w-xl text-[13px] leading-6 text-muted-foreground">
                Not sure where to start? Tap the chat bubble at the bottom-right
                of the screen — our AI assistant can share service times,
                programs, directions, and contact details instantly.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="border-t border-white/10 py-20">
        <motion.div {...fadeUp(0)} className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="glow-blue rounded-2xl border border-primary/30 bg-card/60 p-10 text-center">
            <Church className="mx-auto h-7 w-7 text-accent" />
            <h2 className="mx-auto mt-4 max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
              “And I will answer thee, and shew thee great and mighty things.”
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-muted-foreground">
              {name} · {tagline} · {address}
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="cursor-pointer gap-2">
                <a href="#programs">
                  See our programs <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="cursor-pointer gap-2">
                <a href="#visit">
                  <MapPin className="h-4 w-4" /> Visit us this Sunday
                </a>
              </Button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 bg-card/40 py-12">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="grid gap-10 md:grid-cols-3">
            <div>
              <Wordmark compact />
              <p className="mt-4 max-w-xs text-[13px] leading-6 text-muted-foreground">
                A parish of the Redeemed Christian Church of God, raising
                kingdom ambassadors of solutions across our community and nation.
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Quick links
              </p>
              <ul className="mt-4 space-y-2 text-[13px]">
                {navLinks.map(([label, href]) => (
                  <li key={href}>
                    <a href={href} className="cursor-pointer text-muted-foreground transition-colors hover:text-primary">
                      {label}
                    </a>
                  </li>
                ))}
                <li>
                  <Link
                    to={isAuthenticated ? "/dashboard/church" : "/auth"}
                    className="cursor-pointer text-muted-foreground transition-colors hover:text-primary"
                  >
                    Church admin
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Contact
              </p>
              <ul className="mt-4 space-y-2 text-[13px] text-muted-foreground">
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  {address}
                </li>
                {phones.map((ph) => (
                  <li key={ph} className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-primary" />
                    {ph}
                  </li>
                ))}
                {emails.map((em) => (
                  <li key={em} className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-primary" />
                    {em}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              © {new Date().getFullYear()} {name} · {tagline}
            </p>
            <div className="flex items-center gap-2">
              {socials.slice(0, 6).map((s) => {
                const meta = SOCIAL_ICONS[s.platform] ?? { icon: Globe, label: s.platform };
                return (
                  <a
                    key={`${s.platform}-${s.url}`}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={meta.label}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                  >
                    <meta.icon className="h-3.5 w-3.5" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </footer>

      <ChurchChat />
    </div>
  );
}
