import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { TrialBanner, TrialPill } from "@/components/trial-banner";
import { CoverArt } from "@/components/cover-art";
import { TYPE_META } from "@/components/catalog-meta";
import { formatDate, pluralize, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  CalendarClock,
  Download,
  Library,
  Mic,
  MonitorPlay,
  Radio,
  ScanText,
  UploadCloud,
} from "lucide-react";
import { useNavigate } from "react-router";

const CONN_APPS = [
  { app: "obs", label: "OBS Studio", hint: "Scenes · stream · record" },
  { app: "easyworship", label: "EasyWorship 7", hint: "Slides · schedules" },
  { app: "pewbeam", label: "Pewbeam", hint: "Scripture display · NDI" },
] as const;

export default function Overview() {
  const navigate = useNavigate();
  const services = useQuery(api.services.list);
  const items = useQuery(api.catalog.list, {});
  const transcripts = useQuery(api.transcripts.list);
  const connections = useQuery(api.connections.list);
  const user = useQuery(api.users.currentUser);

  const upcoming = (services ?? [])
    .filter((s) => s.status !== "completed")
    .sort((a, b) => a.date - b.date)
    .slice(0, 3);
  const recent = (items ?? []).slice(0, 4);
  const downloads = (items ?? []).reduce((sum, i) => sum + i.downloads, 0);
  const verses = (transcripts ?? []).reduce(
    (sum, t) => sum + t.verses.length,
    0,
  );

  const stats = [
    {
      label: "Services on the calendar",
      value: services?.length ?? 0,
      icon: CalendarClock,
      to: "/dashboard/services",
    },
    {
      label: "Catalog assets",
      value: items?.length ?? 0,
      icon: Library,
      to: "/dashboard/catalog",
    },
    {
      label: "Downloads",
      value: downloads,
      icon: Download,
      to: "/dashboard/catalog",
    },
    {
      label: "Verses detected",
      value: verses,
      icon: ScanText,
      to: "/dashboard/scripture",
    },
  ];

  const firstName = user?.name?.split(" ")[0];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={new Date().toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
        title={`Welcome back${firstName ? `, ${firstName}` : ""}`}
        description="Your church media console — orchestrate projection, transcription, and the live stream from one place."
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
            <s.icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
            <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">
              {s.value}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{s.label}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Upcoming services */}
        <section className="lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Upcoming services
            </h2>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="cursor-pointer gap-1 text-xs"
            >
              <Link to="/dashboard/services">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          {upcoming.length === 0 ? (
            <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border bg-card/40 p-6">
              <CalendarClock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  No services planned yet
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Build a run-of-show, attach songs and scripture, then drive it
                  live from the control room.
                </p>
              </div>
              <Button
                asChild
                size="sm"
                className="cursor-pointer gap-1.5"
                onClick={() => undefined}
              >
                <Link to="/dashboard/services">Plan a service</Link>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {upcoming.map((s) => (
                <Link
                  key={s._id}
                  to="/dashboard/services"
                  className="group flex cursor-pointer items-center justify-between rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/40"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg border border-border bg-secondary">
                      <span className="text-xs font-bold leading-none text-foreground">
                        {new Date(s.date).getDate()}
                      </span>
                      <span className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground">
                        {new Date(s.date).toLocaleDateString("en-US", {
                          month: "short",
                        })}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                        {s.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {pluralize(s.items.length, "item")} · {formatDate(s.date)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "ml-3 shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em]",
                      s.status === "live" &&
                        "border-accent/40 bg-accent/10 text-accent",
                      s.status === "scheduled" &&
                        "border-primary/40 bg-primary/10 text-primary",
                      s.status === "draft" &&
                        "border-border bg-secondary text-muted-foreground",
                    )}
                  >
                    {s.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Connections */}
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Desktop integrations
            </h2>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="cursor-pointer gap-1 text-xs"
            >
              <Link to="/dashboard/control">
                Open console <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          <div className="flex flex-col gap-2.5">
            {CONN_APPS.map((c) => {
              const conn = (connections ?? []).find((x) => x.app === c.app);
              const configured = !!conn && conn.enabled;
              return (
                <Link
                  key={c.app}
                  to="/dashboard/control"
                  className="group flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/40"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary">
                    <Radio className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold tracking-tight text-foreground">
                      {c.label}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {configured ? c.hint : "Not configured"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      configured ? "bg-emerald-400" : "bg-muted-foreground/40",
                    )}
                    title={configured ? "Configured" : "Not configured"}
                  />
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      {/* Recent uploads */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Recent content
          </h2>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="cursor-pointer gap-1 text-xs"
          >
            <Link to="/dashboard/catalog">
              Browse catalog <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
        {recent.length === 0 ? (
          <div className="flex items-center justify-between rounded-xl border border-dashed border-border bg-card/40 p-5">
            <div className="flex items-center gap-3">
              <MonitorPlay className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                The catalog is being seeded with starter content…
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="cursor-pointer gap-1.5"
            >
              <Link to="/dashboard/upload">
                <UploadCloud className="h-3.5 w-3.5" /> Upload
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {recent.map((item) => (
              <Link
                key={item._id}
                to={`/dashboard/catalog/${item._id}`}
                className="group cursor-pointer overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/40"
              >
                <CoverArt item={item} className="aspect-[4/3] w-full" />
                <div className="p-3">
                  <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                    {item.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {item.artist || item.reference || timeAgo(item._creationTime)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Quick actions */}
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          {
            label: "Go live",
            desc: "Open the control room and drive the service.",
            icon: Radio,
            to: "/dashboard/control",
            primary: true,
          },
          {
            label: "Plan a service",
            desc: "Build the run-of-show with songs and scripture.",
            icon: CalendarClock,
            to: "/dashboard/services",
          },
          {
            label: "Transcribe a sermon",
            desc: "Paste a transcript and detect every verse.",
            icon: Mic,
            to: "/dashboard/scripture",
          },
        ].map((a) => (
          <button
            key={a.label}
            onClick={() => navigate(a.to)}
            className={cn(
              "group cursor-pointer rounded-xl border p-4 text-left transition-colors",
              a.primary
                ? "border-primary/50 bg-primary/10 hover:bg-primary/15"
                : "border-border bg-card hover:border-primary/40",
            )}
          >
            <a.icon
              className={cn(
                "h-4 w-4",
                a.primary ? "text-primary" : "text-muted-foreground",
              )}
            />
            <p className="mt-3 text-sm font-semibold tracking-tight text-foreground">
              {a.label}
            </p>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
              {a.desc}
            </p>
          </button>
        ))}
      </section>
    </div>
  );
}
