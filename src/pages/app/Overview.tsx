import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { TrialBanner, TrialPill } from "@/components/trial-banner";
import { CoverArt } from "@/components/cover-art";
import { useObs } from "@/lib/obs";
import { formatDate, pluralize, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  CalendarClock,
  ClipboardCopy,
  Cross,
  Download,
  Library,
  RadioTower,
  ScanText,
  UploadCloud,
  Video,
} from "lucide-react";

const TYPE_LABEL: Record<string, string> = {
  song: "Song",
  scripture: "Scripture",
  background: "Background",
  template: "Template",
};

export default function Overview() {
  const navigate = useNavigate();
  const services = useQuery(api.services.list);
  const items = useQuery(api.catalog.list, {});
  const transcripts = useQuery(api.transcripts.list);
  const streamTargets = useQuery(api.streams.list);
  const obs = useObs();

  const upcoming = (services ?? [])
    .filter((s) => s.status !== "completed")
    .sort((a, b) => a.date - b.date)
    .slice(0, 3);
  const nextService = upcoming[0] ?? null;
  const recent = (items ?? []).slice(0, 4);
  const downloads = (items ?? []).reduce((sum, i) => sum + i.downloads, 0);
  const verses = (transcripts ?? []).reduce((sum, t) => sum + t.verses.length, 0);
  const streamKey = streamTargets?.[0]?.streamKey ?? null;

  const stats = [
    { label: "Services planned", value: services?.length ?? 0, icon: CalendarClock, to: "/dashboard/services" },
    { label: "Catalog assets", value: items?.length ?? 0, icon: Library, to: "/dashboard/catalog" },
    { label: "Downloads", value: downloads, icon: Download, to: "/dashboard/catalog" },
    { label: "Verses detected", value: verses, icon: ScanText, to: "/dashboard/scripture" },
  ];

  const copyStreamKey = async () => {
    if (!streamKey) return;
    try {
      await navigator.clipboard.writeText(streamKey);
      toast.success("Stream key copied to clipboard");
    } catch {
      toast.error("Could not copy — your browser blocked clipboard access");
    }
  };

  const obsOnline = obs.status === "connected";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={new Date().toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
        title="Dashboard"
        description="Your church media console — projection, transcription, and the live stream in one place."
        actions={<TrialPill />}
      />

      <TrialBanner />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <button
            key={s.label}
            onClick={() => navigate(s.to)}
            className="group cursor-pointer rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-secondary">
              <s.icon className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-primary" />
            </span>
            <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">
              {s.value}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{s.label}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* ── Main column ─────────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-3">
          {/* Recent content */}
          <section className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold tracking-tight text-foreground">
                  Recent content
                </h2>
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                  Songs · scripture · backgrounds
                </p>
              </div>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="cursor-pointer gap-1 text-xs"
              >
                <Link to="/dashboard/catalog">
                  View all <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            {recent.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-secondary/30 p-5 text-sm text-muted-foreground">
                The catalog is being seeded with starter content…
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {recent.map((item) => (
                  <Link
                    key={item._id}
                    to={`/dashboard/catalog/${item._id}`}
                    className="group cursor-pointer overflow-hidden rounded-xl border border-border bg-secondary/30 transition-colors hover:border-primary/40"
                  >
                    <div className="relative">
                      <CoverArt item={item} className="aspect-[4/3] w-full" />
                      <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.18em] text-white/90 backdrop-blur">
                        {TYPE_LABEL[item.type] ?? item.type}
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                        {item.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {item.artist ||
                          item.reference ||
                          timeAgo(item._creationTime)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Quick actions + banner */}
          <section className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold tracking-tight text-foreground">
                  Quick actions
                </h2>
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                  Jump straight into the booth
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                className="cursor-pointer gap-1.5"
                onClick={() => navigate("/dashboard/control")}
              >
                <RadioTower className="h-4 w-4" /> Go Live
              </Button>
              <Button
                variant="outline"
                className="cursor-pointer gap-1.5"
                onClick={() => navigate("/dashboard/upload")}
              >
                <UploadCloud className="h-4 w-4" /> Upload Media
              </Button>
            </div>
            {/* Glow banner */}
            <button
              onClick={() => navigate("/dashboard/control")}
              className="group relative mt-4 flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-primary/30 p-8 text-center transition-colors hover:border-primary/60"
            >
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(60% 90% at 50% 0%, oklch(0.6 0.2 292 / 45%), transparent 70%), radial-gradient(45% 60% at 50% 100%, oklch(0.7 0.18 84 / 20%), transparent 70%)",
                }}
              />
              <div className="relative flex flex-col items-center gap-2">
                <Cross className="h-8 w-8 text-white drop-shadow-[0_0_18px_oklch(0.72_0.19_292)] transition-transform group-hover:scale-110" />
                <p className="text-sm font-bold tracking-tight text-white">
                  Your next service starts here
                </p>
                <p className="text-xs text-white/70">
                  Open the control room to go live, switch scenes, and push
                  slides to the display.
                </p>
              </div>
            </button>
          </section>
        </div>

        {/* ── Right rail ───────────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          {/* Live stream */}
          <section className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold tracking-tight text-foreground">
                  Live Stream
                </h2>
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                  Upcoming broadcast
                </p>
              </div>
              <Button
                size="sm"
                className="cursor-pointer gap-1.5"
                onClick={() => navigate("/dashboard/control")}
              >
                <RadioTower className="h-3.5 w-3.5" /> Start New Stream
              </Button>
            </div>
            {nextService ? (
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
                  <CalendarClock className="h-4 w-4 text-primary" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                    {nextService.title}
                  </p>
                  <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                    {formatDate(nextService.date)} ·{" "}
                    {pluralize(nextService.items.length, "item")}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em]",
                    nextService.status === "live"
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-secondary text-muted-foreground",
                  )}
                >
                  {nextService.status}
                </span>
              </div>
            ) : (
              <div className="mt-3 rounded-lg border border-dashed border-border bg-secondary/30 p-4">
                <p className="text-xs leading-5 text-muted-foreground">
                  No services planned yet. Build a run-of-show, then its
                  schedule appears here.
                </p>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="mt-3 cursor-pointer gap-1.5"
                >
                  <Link to="/dashboard/services">Plan a service</Link>
                </Button>
              </div>
            )}
          </section>

          {/* Stream key */}
          <section className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold tracking-tight text-foreground">
                Stream Key
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 cursor-pointer text-xs text-muted-foreground"
                onClick={() => navigate("/dashboard/control")}
              >
                Manage
              </Button>
            </div>
            {streamKey ? (
              <>
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2.5">
                  <p className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
                    {streamKey.replace(/./g, "•")}
                  </p>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
                    onClick={copyStreamKey}
                    title="Copy stream key"
                  >
                    <ClipboardCopy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
                  Use this stream key in your broadcast software to connect to
                  your Alpha Worship One live stream.
                </p>
              </>
            ) : (
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                No stream target saved yet. Add one in the Control Room and its
                key will appear here.
              </p>
            )}
          </section>

          {/* Stream preview */}
          <section className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold tracking-tight text-foreground">
                Stream Preview
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 cursor-pointer gap-1 text-xs text-muted-foreground"
                onClick={() => navigate("/dashboard/control")}
              >
                Open console <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
            <div className="relative mt-3 aspect-video w-full overflow-hidden rounded-xl border border-border bg-black">
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(70% 90% at 50% 20%, oklch(0.6 0.2 292 / 35%), transparent 70%)",
                }}
              />
              {obsOnline ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
                  {obs.streaming ? (
                    <span className="flex items-center gap-1.5 rounded-full border border-red-400/50 bg-red-500/15 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.2em] text-red-400">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
                      Live
                    </span>
                  ) : (
                    <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/60">
                      On standby
                    </span>
                  )}
                  <span className="font-mono text-[10px] text-white/80">
                    {obs.currentScene ?? "Program"}
                  </span>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-4 text-center">
                  <Video className="h-5 w-5 text-white/50" />
                  <p className="text-xs font-semibold text-white/80">
                    Preview idle
                  </p>
                  <p className="text-[11px] text-white/50">
                    Connect OBS in the Control Room to see your broadcast here.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
