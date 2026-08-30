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
  HandCoins,
  HeartHandshake,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Moon,
  Music2,
  Navigation,
  Phone,
  Radio,
  Sparkles,
  Sunrise,
  Twitter,
  Users,
  Youtube,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Category = "daily" | "weekly" | "monthly";

const CATEGORY_META: Record<
  Category,
  { label: string; icon: LucideIcon; blurb: string }
> = {
  daily: { label: "Daily", icon: Sunrise, blurb: "Every-day encounters with God" },
  weekly: { label: "Weekly", icon: CalendarDays, blurb: "The rhythm of parish life" },
  monthly: { label: "Monthly", icon: Moon, blurb: "Special gatherings & thanksgiving" },
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

const DEFAULT_NAME = "RCCG Solution Ambassadors Dobro";
const DEFAULT_TAGLINE = "A Parish of the Redeemed Christian Church of God";
const DEFAULT_VERSE =
  "Jesus Christ the same yesterday, and to day, and for ever. — Hebrews 13:8";

const FALLBACK_SERVICES = [
  {
    title: "Thanksgiving Service",
    description:
      "A glorious time of praise, worship, and the undiluted Word of God for the whole family.",
    day: "Every Sunday",
    time: "8:00 AM – 11:00 AM",
    venue: "Dobro",
  },
  {
    title: "Digging Deep",
    description:
      "Deep, interactive study of the scriptures led by our ministers.",
    day: "Every Tuesday",
    time: "6:00 PM – 7:00 PM",
    venue: "Dobro",
  },
  {
    title: "Faith Clinic",
    description:
      "Practical teaching that turns the Word into workable solutions for everyday life.",
    day: "Every Thursday",
    time: "6:00 PM – 7:00 PM",
    venue: "Dobro",
  },
  {
    title: "Youth Sunday",
    description:
      "A special Sunday when the youths lead and minister during the main service.",
    day: "Every Third Sunday",
    time:      "During Thanksgiving Service",
    venue: "Dobro",
  },
];

const FALLBACK_SUNDAY = FALLBACK_SERVICES[0];

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
    "RCCG Solution Ambassadors Dobro is a vibrant, Christ-centred parish of the Redeemed Christian Church of God, raising kingdom ambassadors who carry practical, godly solutions to their homes, workplaces, schools, and communities.";
  const verse = info?.verse ?? DEFAULT_VERSE;
  const address =
    info?.address ?? "Radiance Fuel Station, opposite Fet-Power, Dobro, Nsawam, Ghana";
  const phones = info?.phones ?? [];
  const emails = info?.emails ?? [];
  const socials = info?.socials ?? [];
  const website = info?.website ?? "";
  const allPrograms = programs ?? [];

  const grouped = (cat: Category) =>
    allPrograms
      .filter((p) => p.category === cat)
      .sort((a, b) => a.order - b.order);
  const counts = (Object.keys(CATEGORY_META) as Category[]).map((cat) => ({
    cat,
    count: grouped(cat).length,
  }));

  // Exact pinned location of the parish on Google Maps.
  const mapsHref =
    "https://www.google.com/maps/place/RCCG+Solution+Ambassadors,+Dobro,+Radiance+fuel+station,+Accra/data=!4m2!3m1!1s0xfdf0b4a264f50a3:0xbde57be899afbf6f!18m1!1e1";
  const weeklyPrograms = allPrograms.filter((p) => p.category === "weekly");
  const services = weeklyPrograms.length
    ? weeklyPrograms.map((p) => ({
        title: p.title,
        description: p.description,
        day: p.day,
        time: p.time,
        venue: p.venue ?? "Dobro",
      }))
    : FALLBACK_SERVICES;
  const sundayService =
    weeklyPrograms.find((p) => p.title.toLowerCase().includes("main service") || p.title.toLowerCase().includes("sunday service")) ??
    null;

  // Next gathering: whatever is coming up today, otherwise the Sunday service.
  const todayNow = new Date();
  const todaysPrograms = sortByStartTime(
    allPrograms.filter((p) => isProgramToday(p.day, todayNow)),
  );
  const nowMinutes = todayNow.getHours() * 60 + todayNow.getMinutes();
  const nextUp =
    todaysPrograms.find((p) => (parseStartMinutes(p.time) ?? 0) >= nowMinutes) ??
    null;
  const nextGathering = nextUp ?? sundayService ?? FALLBACK_SUNDAY;

  const navLinks: [string, string][] = [
    ["Next service", "#next"],
    ["About", "#about"],
    ["Services", "#services"],
    ["Programs", "#programs"],
    ["Live", "#live"],
    ["Visit us", "#visit"],
    ["Contact", "#contact"],
  ];
  const headerLinks = navLinks.filter(([label]) =>
    ["About", "Services", "Programs", "Live", "Contact"].includes(label),
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="#top" className="flex cursor-pointer items-center gap-2.5">
            <LogoMark className="h-9 w-9" />
            <div className="leading-none">
              <p className="text-[15px] font-bold tracking-tight">
                Solution<span className="text-primary"> Ambassadors</span>
              </p>
              <p className="mt-1 hidden font-mono text-[8px] uppercase tracking-[0.24em] text-muted-foreground sm:block">
                RCCG Parish · Dobro
              </p>
            </div>
          </a>
          <nav className="hidden items-center gap-1 lg:flex">
            {headerLinks.map(([label, href]) => (
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
              <a href="#services">
                Join us <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section id="top" className="glow-blue relative overflow-hidden pt-32 pb-20 sm:pt-40">
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
                RCCG Solution Ambassadors Dobro
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              Join us in worship and community as we grow in faith, love, and
              service together.
            </p>
            <p className="mx-auto mt-6 max-w-xl font-display text-lg italic leading-8 text-accent/90">
              “{verse.replace(/ — .*$/, "")}”
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {verse.split("—")[1]?.trim()}
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="cursor-pointer gap-2">
                <a href="#services">
                  Explore services <ArrowRight className="h-4 w-4" />
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

      {/* ── Next service band ───────────────────────────────────────────── */}
      <section id="next" className="border-t border-white/10 py-10">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <motion.div
            {...fadeUp(0)}
            className="glow-blue flex flex-col items-start justify-between gap-6 rounded-2xl border border-accent/30 bg-card/60 p-8 sm:flex-row sm:items-center"
          >
            <div className="flex items-start gap-4">
              <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <CalendarDays className="h-5 w-5" />
                <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                  <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-accent" />
                </span>
              </span>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
                  {nextUp ? "Up next · today" : "Up next · weekly"}
                </p>
                <h2 className="mt-1.5 font-display text-2xl font-bold tracking-tight sm:text-3xl">
                  {nextGathering.title}
                </h2>
                <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    {nextGathering.day} · {nextGathering.time}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    {nextGathering.venue}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="cursor-pointer gap-2">
                <a href="#visit">
                  <Navigation className="h-4 w-4" /> Get directions
                </a>
              </Button>
              <Button asChild variant="outline" className="cursor-pointer gap-2">
                <a href="#programs">
                  See all programs <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── About ───────────────────────────────────────────────────────── */}
      <section id="about" className="border-t border-white/10 py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="grid items-start gap-12 lg:grid-cols-2">
            <motion.div {...fadeUp(0)}>
              <p className="tech-label">About our church</p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                A welcoming community{" "}
                <span className="text-primary">rooted in love, service & faith</span>.
              </h2>
              <p className="mt-5 text-[15px] leading-7 text-muted-foreground">
                At {name}, we strive to create a welcoming community rooted in
                love, service, and faith. Our mission is to inspire and uplift
                all through worship and fellowship — raising kingdom ambassadors
                who carry practical, godly solutions into their homes,
                workplaces, schools, and communities.
              </p>
              <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
                Whether you are joining us for the first time or you have walked
                with us for years, you are family here. Come as you are — we
                would love to meet you.
              </p>
              <div className="mt-7 flex flex-wrap gap-2">
                {["Thanksgiving Service", "Digging Deep", "Faith Clinic", "Youth Sunday"].map(
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
            <div className="grid gap-3">
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

      {/* ── Services we offer ───────────────────────────────────────────── */}
      <section id="services" className="border-t border-white/10 py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <motion.div {...fadeUp(0)} className="mx-auto max-w-2xl text-center">
            <p className="tech-label">Services we offer</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              A vibrant community, every week.
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
              Join us for uplifting services every Sunday at 8:00 AM and 11:00
              AM, and on Tuesdays and Thursdays at 6:00 PM. Experience a vibrant
              community and spiritual growth with us!
            </p>
          </motion.div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((s, i) => (
              <motion.div
                key={s.title}
                {...fadeUp(0.05 * i)}
                className="group flex flex-col rounded-xl border border-white/10 bg-card p-5 transition-colors hover:border-primary/40"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Clock className="h-4 w-4" />
                  </span>
                  <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-accent">
                    {s.day}
                  </span>
                </div>
                <h3 className="mt-4 text-[15px] font-bold tracking-tight">{s.title}</h3>
                <p className="mt-1.5 flex-1 text-[13px] leading-6 text-muted-foreground">
                  {s.description}
                </p>
                <div className="mt-4 space-y-1.5 border-t border-white/10 pt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-primary" /> {s.time}
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-primary" /> {s.venue}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Programs & events ───────────────────────────────────────────── */}
      <section id="programs" className="border-t border-white/10 py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <motion.div {...fadeUp(0)} className="mx-auto max-w-2xl text-center">
            <p className="tech-label">Programs & events</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Daily, weekly & monthly.
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
              Explore our programs, special services, community gatherings,
              workshops, and celebrations — there is always something happening
              at {name}.
            </p>
          </motion.div>

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

          <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {CATEGORY_META[activeTab].blurb}
          </p>

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
                  <h3 className="mt-4 text-[15px] font-bold tracking-tight">{p.title}</h3>
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

      {/* ── Live streaming ──────────────────────────────────────────────── */}
      <section id="live" className="border-t border-white/10 py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="grid items-stretch gap-6 lg:grid-cols-2">
            <motion.div
              {...fadeUp(0)}
              className="glow-blue flex flex-col justify-between rounded-2xl border border-white/10 bg-card p-8"
            >
              <div>
                <p className="tech-label">Live streaming services</p>
                <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                  Worship with us, wherever you are.
                </h2>
                <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
                  Join our services online every Sunday and during special
                  events. Experience worship from the comfort of your home,
                  engaging with our community through live-streamed sermons and
                  uplifting music.
                </p>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="cursor-pointer gap-2">
                  <a href="#services">
                    <Radio className="h-4 w-4" /> See our services
                  </a>
                </Button>
              </div>
            </motion.div>

            {/* Broadcast-style panel */}
            <motion.div
              {...fadeUp(0.1)}
              className="flex flex-col justify-between rounded-2xl border border-white/10 bg-card p-8"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                  </span>
                  On air · Sundays
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  RCCG SA · Dobro
                </span>
              </div>
              <div className="mt-10 space-y-4">
                {[
                  { icon: Users, label: "Live services", value: "Every Sunday & special events" },
                  { icon: Music2, label: "Music & ministration", value: "Praise, worship & the Word" },
                  { icon: MessageCircle, label: "Engage with us", value: "Chat, pray, and connect from home" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center gap-4 rounded-xl border border-white/10 bg-secondary/40 p-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <row.icon className="h-4.5 w-4.5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold tracking-tight">{row.label}</p>
                      <p className="text-xs text-muted-foreground">{row.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
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
                        Radiance Fuel Station · all welcome
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-primary">
                      <CalendarDays className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">Thanksgiving Service</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Every Sunday · 8:00 AM – 11:00 AM · Dobro
                      </p>
                    </div>
                  </div>
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
                {website && (
                  <a
                    href={website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 p-4 text-center transition-colors hover:border-primary/70"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary transition-transform group-hover:scale-110">
                      <Globe className="h-4.5 w-4.5" />
                    </span>
                    <span className="text-xs font-semibold">Website</span>
                  </a>
                )}
                {socials.length === 0 && !website ? (
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

      {/* ── Support our mission ─────────────────────────────────────────── */}
      <section id="support" className="border-t border-white/10 py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <motion.div
            {...fadeUp(0)}
            className="glow-blue relative overflow-hidden rounded-2xl border border-primary/30 bg-card/60 p-10 text-center sm:p-14"
          >
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <HandCoins className="h-6 w-6" />
            </span>
            <h2 className="mx-auto mt-5 max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Support our mission
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-7 text-muted-foreground">
              Your generous donations help us continue our outreach and
              community services. Together, we can make a positive impact and
              spread love through our church initiatives.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="cursor-pointer gap-2">
                <a href={`mailto:${emails[0] ?? "rccgsolutionambassador@gmail.com"}?subject=Offering%20%26%20Donations`}>
                  <HeartHandshake className="h-4 w-4" /> Offer a gift
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="cursor-pointer gap-2">
                <a href="#contact">
                  <Phone className="h-4 w-4" /> Talk to us
                </a>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Contact ─────────────────────────────────────────────────────── */}
      <section id="contact" className="border-t border-white/10 py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <motion.div {...fadeUp(0)} className="mx-auto max-w-2xl text-center">
            <p className="tech-label">Get in touch</p>
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
                {(phones.length ? phones : ["+233 23 822 2901", "+233 24 601 0017"]).map((ph) => (
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
                {(emails.length ? emails : ["rccgsolutionambassador@gmail.com"]).map((em) => (
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
            <LogoMark className="mx-auto h-10 w-10" />
            <h2 className="mx-auto mt-4 max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
              “And I will answer thee, and shew thee great and mighty things.”
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-muted-foreground">
              {name} · {tagline} · {address}
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="cursor-pointer gap-2">
                <a href="#services">
                  See our services <ArrowRight className="h-4 w-4" />
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
                A parish of the Redeemed Christian Church of God in Dobro,
                raising kingdom ambassadors of solutions across our community
                and nation.
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
                    {isAuthenticated ? "Church admin" : "Sign in"}
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
                {(phones.length ? phones : ["+233 23 822 2901", "+233 24 601 0017"]).map((ph) => (
                  <li key={ph} className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-primary" />
                    {ph}
                  </li>
                ))}
                {(emails.length ? emails : ["rccgsolutionambassador@gmail.com"]).map((em) => (
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
