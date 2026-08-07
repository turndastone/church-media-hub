import { api } from "@/convex/_generated/api";
import { useAction, useQuery } from "convex/react";
import { Link, useNavigate } from "react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { TrialBanner, TrialPill } from "@/components/trial-banner";
import { CoverArt } from "@/components/cover-art";
import { useObs } from "@/lib/obs";
import { connectorClient } from "@/lib/integrations";
import { formatDate, pluralize, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  BookOpenText,
  CalendarClock,
  ClipboardCopy,
  Cross,
  Download,
  Image as ImageIcon,
  Library,
  ListVideo,
  MonitorPlay,
  Music2,
  Palette,
  Play,
  RadioTower,
  ScanText,
  Search,
  UploadCloud,
  Video,
} from "lucide-react";

const TYPE_LABEL: Record<string, string> = {
  song: "Song",
  scripture: "Scripture",
  background: "Background",
  template: "Template",
};

type LibraryTab = "all" | "song" | "scripture" | "background" | "template" | "presentations";

const LIB_TABS: { key: LibraryTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "song", label: "Songs", icon: Music2 },
  { key: "scripture", label: "Scriptures", icon: BookOpenText },
  { key: "background", label: "Media", icon: ImageIcon },
  { key: "presentations", label: "Presentations", icon: ListVideo },
  { key: "template", label: "Themes", icon: Palette },
];

const LIB_SIDEBAR: { key: LibraryTab | "recent" | "popular"; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "all", label: "All content", icon: Library },
  { key: "song", label: "Songs", icon: Music2 },
  { key: "scripture", label: "Scriptures", icon: BookOpenText },
  { key: "background", label: "Media", icon: ImageIcon },
  { key: "template", label: "Themes", icon: Palette },
  { key: "presentations", label: "Presentations", icon: ListVideo },
];

type SortKey = "recent" | "popular";

export default function Overview() {
  const navigate = useNavigate();
  const services = useQuery(api.services.list);
  const items = useQuery(api.catalog.list, {});
  const transcripts = useQuery(api.transcripts.list);
  const streamTargets = useQuery(api.streams.list);
  const connections = useQuery(api.connections.list);
  const getSecrets = useAction(api.connections.secrets);
  const obs = useObs();

  // Media library state
  const [libTab, setLibTab] = useState<LibraryTab>("all");
  const [sortKey, setSortKey] = useState<SortKey>("recent");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const catalog = items ?? [];
  const upcoming = (services ?? [])
    .filter((s) => s.status !== "completed")
    .sort((a, b) => a.date - b.date)
    .slice(0, 4);
  const nextService = upcoming[0] ?? null;
  const recent = [...catalog]
    .sort((a, b) => b._creationTime - a._creationTime)
    .slice(0, 4);
  const downloads = catalog.reduce((sum, i) => sum + i.downloads, 0);
  const verses = (transcripts ?? []).reduce((sum, t) => sum + t.verses.length, 0);
  const streamKey = streamTargets?.[0]?.streamKey ?? null;

  const stats = [
    { label: "Services planned", value: services?.length ?? 0, icon: CalendarClock, to: "/dashboard/services" },
    { label: "Catalog assets", value: catalog.length, icon: Library, to: "/dashboard/catalog" },
    { label: "Downloads", value: downloads, icon: Download, to: "/dashboard/catalog" },
    { label: "Verses detected", value: verses, icon: ScanText, to: "/dashboard/scripture" },
  ];

  // ── Library derivation ──────────────────────────────────────────────
  const libraryItems = useMemo(() => {
    if (libTab === "presentations") return [];
    const byTab = libTab === "all" ? catalog : catalog.filter((i) => i.type === libTab);
    const q = query.trim().toLowerCase();
    const filtered = q
      ? byTab.filter((i) =>
          `${i.title} ${i.artist ?? ""} ${i.reference ?? ""}`.toLowerCase().includes(q),
        )
      : byTab;
    return [...filtered].sort((a, b) =>
      sortKey === "popular" ? b.downloads - a.downloads : b._creationTime - a._creationTime,
    );
  }, [catalog, libTab, query, sortKey]);

  const libraryServices = useMemo(() => {
    if (libTab !== "presentations") return [];
    const q = query.trim().toLowerCase();
    const list = (services ?? []).filter((s) => s.status !== "completed");
    const filtered = q ? list.filter((s) => s.title.toLowerCase().includes(q)) : list;
    return [...filtered].sort((a, b) => a.date - b.date);
  }, [services, libTab, query]);

  const selected = selectedId
    ? libTab === "presentations"
      ? (services ?? []).find((s) => s._id === selectedId) ?? null
      : catalog.find((i) => i._id === selectedId) ?? null
    : null;

  // ── Actions ─────────────────────────────────────────────────────────
  const copyStreamKey = async () => {
    if (!streamKey) return;
    try {
      await navigator.clipboard.writeText(streamKey);
      toast.success("Stream key copied to clipboard");
    } catch {
      toast.error("Could not copy — your browser blocked clipboard access");
    }
  };

  const projectTitle = async (title: string) => {
    const pewbeam = (connections ?? []).find((c) => c.app === "pewbeam" && c.url);
    if (!pewbeam?.url) {
      toast.error("Configure the PewBeam connector first — Integrations → PewBeam.");
      return;
    }
    let token: string | null = null;
    if (pewbeam.secretsStored) {
      try {
        const sec = await getSecrets({ app: "pewbeam" });
        token = sec.token;
      } catch {
        // Token stays null — the connector may not require auth.
      }
    }
    const res = await connectorClient.send(
      pewbeam.url,
      { app: "pewbeam", action: "show", payload: { title } },
      token,
    );
    if (res.ok) toast.success(`Sent “${title}” to the display`);
    else toast.error(res.message);
  };

  const obsOnline = obs.status === "connected";

  const TOOL_ACTIONS = [
    { label: "Go Live", icon: RadioTower, to: "/dashboard/control", primary: true },
    { label: "Upload", icon: UploadCloud, to: "/dashboard/upload" },
    { label: "New Service", icon: CalendarClock, to: "/dashboard/services" },
    { label: "Console", icon: MonitorPlay, to: "/dashboard" },
  ];

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

      {/* ── Toolbar (grouped icon + label buttons) ─────────────────────── */}
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-card p-2">
        {TOOL_ACTIONS.map((a, i) => (
          <div key={a.to} className="flex items-center gap-1">
            {i === 4 && <span className="mx-1 h-8 w-px bg-border" />}
            <button
              onClick={() => navigate(a.to)}
              className={cn(
                "flex w-16 cursor-pointer flex-col items-center gap-1 rounded-lg px-1 py-2 transition-colors",
                a.primary
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <a.icon className="h-4 w-4" />
              <span className="text-[10px] font-semibold leading-3">{a.label}</span>
            </button>
          </div>
        ))}
        <span className="mx-1 hidden h-8 w-px bg-border sm:block" />
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="cursor-pointer gap-1.5 text-muted-foreground"
        >
          <Link to="/dashboard/integrations">
            <ScanText className="h-3.5 w-3.5" /> Manage integrations
          </Link>
        </Button>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
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
            <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">{s.value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{s.label}</p>
          </button>
        ))}
      </div>

      {/* ── Upper region: Schedule | Recent content | Live Output ──────── */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Schedule */}
        <section className="rounded-xl border border-border bg-card p-4 lg:col-span-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold tracking-tight text-foreground">Schedule</h2>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-7 cursor-pointer gap-1 text-xs text-muted-foreground"
            >
              <Link to="/dashboard/services">
                All <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
          {upcoming.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-secondary/30 p-3 text-xs leading-5 text-muted-foreground">
              No services planned yet. Build a run-of-show and it appears here.
              <Button
                asChild
                variant="outline"
                size="sm"
                className="mt-2 cursor-pointer gap-1.5"
              >
                <Link to="/dashboard/services">Plan a service</Link>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {upcoming.map((s) => (
                <Link
                  key={s._id}
                  to="/dashboard/services"
                  className="group flex cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-secondary/30 px-2.5 py-2 transition-colors hover:border-primary/40"
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border",
                      s.status === "live"
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-secondary text-muted-foreground",
                    )}
                  >
                    <CalendarClock className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-foreground">
                      {s.title}
                    </span>
                    <span className="block font-mono text-[8px] uppercase tracking-[0.16em] text-muted-foreground">
                      {formatDate(s.date)} · {pluralize(s.items.length, "item")}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.14em]",
                      s.status === "live"
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-secondary text-muted-foreground",
                    )}
                  >
                    {s.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Recent content (Live-style grid) */}
        <section className="rounded-xl border border-border bg-card p-4 lg:col-span-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold tracking-tight text-foreground">Recent content</h2>
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                Latest in the catalog
              </p>
            </div>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-7 cursor-pointer gap-1 text-xs text-muted-foreground"
            >
              <Link to="/dashboard/catalog">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
          {recent.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-secondary/30 p-5 text-sm text-muted-foreground">
              The catalog is being seeded with starter content…
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {recent.map((item) => (
                <Link
                  key={item._id}
                  to={`/dashboard/catalog/${item._id}`}
                  className="group cursor-pointer overflow-hidden rounded-lg border border-border bg-secondary/30 transition-colors hover:border-primary/40"
                >
                  <div className="relative">
                    <CoverArt item={item} className="aspect-[4/3] w-full" />
                    <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.18em] text-white/90 backdrop-blur">
                      {TYPE_LABEL[item.type] ?? item.type}
                    </span>
                  </div>
                  <div className="p-2.5">
                    <p className="truncate text-xs font-semibold tracking-tight text-foreground">
                      {item.title}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {item.artist || item.reference || timeAgo(item._creationTime)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Live Output */}
        <section className="flex flex-col rounded-xl border border-border bg-card p-4 lg:col-span-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold tracking-tight text-foreground">Live Output</h2>
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                Broadcast status
              </p>
            </div>
            <Button
              size="sm"
              className="cursor-pointer gap-1.5"
              onClick={() => navigate("/dashboard/control")}
            >
              <RadioTower className="h-3.5 w-3.5" /> Go Live
            </Button>
          </div>
          <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-black">
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
                <p className="text-xs font-semibold text-white/80">Preview idle</p>
                <p className="text-[11px] text-white/50">
                  Connect OBS in the Control Room to see your broadcast here.
                </p>
              </div>
            )}
          </div>

          {/* Stream key */}
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2">
            <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-muted-foreground">
              Key
            </span>
            {streamKey ? (
              <>
                <p className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">
                  {streamKey.replace(/./g, "•")}
                </p>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
                  onClick={copyStreamKey}
                  title="Copy stream key"
                >
                  <ClipboardCopy className="h-3 w-3" />
                </Button>
              </>
            ) : (
              <p className="flex-1 text-[11px] text-muted-foreground">
                No target yet — add one in the Control Room.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* ── Lower region: Media library ────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-4">
        {/* Tabs + search */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 overflow-x-auto">
            {LIB_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setLibTab(t.key);
                  setSelectedId(null);
                }}
                className={cn(
                  "flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  libTab === t.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <t.icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            ))}
          </div>
          <div className="relative w-full max-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search any field…"
              className="h-9 rounded-lg pl-8 text-xs"
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          {/* Category sidebar */}
          <aside className="flex flex-col gap-0.5 lg:col-span-2">
            {LIB_SIDEBAR.map((c) => (
              <button
                key={c.key}
                onClick={() => {
                  if (c.key === "recent" || c.key === "popular") {
                    setSortKey(c.key);
                  } else {
                    setLibTab(c.key);
                    setSelectedId(null);
                  }
                }}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
                  c.key === "recent" || c.key === "popular"
                    ? sortKey === c.key
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    : libTab === c.key
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                <c.icon className="h-3.5 w-3.5" /> {c.label}
              </button>
            ))}
            <div className="mt-3 border-t border-border pt-3">
              <p className="px-2.5 font-mono text-[8px] uppercase tracking-[0.2em] text-muted-foreground">
                Sort
              </p>
              {(
                [
                  { key: "recent", label: "Recently added" },
                  { key: "popular", label: "Most popular" },
                ] as { key: SortKey; label: string }[]
              ).map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSortKey(s.key)}
                  className={cn(
                    "mt-1 flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
                    sortKey === s.key
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </aside>

          {/* Thumbnail grid */}
          <div className="lg:col-span-7">
            {libTab === "presentations" ? (
              libraryServices.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border bg-secondary/30 p-5 text-xs text-muted-foreground">
                  No presentations yet — plan a service in Services.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {libraryServices.map((s) => (
                    <button
                      key={s._id}
                      onClick={() => setSelectedId(s._id)}
                      className={cn(
                        "cursor-pointer rounded-lg border p-3 text-left transition-colors",
                        selectedId === s._id
                          ? "border-primary/60 bg-primary/10"
                          : "border-border bg-secondary/30 hover:border-primary/40",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-lg border",
                          selectedId === s._id
                            ? "border-primary/40 bg-primary/15 text-primary"
                            : "border-border bg-secondary text-muted-foreground",
                        )}
                      >
                        <ListVideo className="h-4 w-4" />
                      </span>
                      <p className="mt-2 truncate text-xs font-semibold text-foreground">{s.title}</p>
                      <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.16em] text-muted-foreground">
                        {formatDate(s.date)} · {pluralize(s.items.length, "item")} · {s.status}
                      </p>
                    </button>
                  ))}
                </div>
              )
            ) : libraryItems.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-secondary/30 p-5 text-xs text-muted-foreground">
                {query
                  ? "No items match your search."
                  : "No items in this category yet — upload some from the Upload page."}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {libraryItems.map((item) => (
                  <button
                    key={item._id}
                    onClick={() => setSelectedId(item._id)}
                    className={cn(
                      "group cursor-pointer overflow-hidden rounded-lg border text-left transition-colors",
                      selectedId === item._id
                        ? "border-primary/60"
                        : "border-border bg-secondary/30 hover:border-primary/40",
                    )}
                  >
                    <div className="relative">
                      <CoverArt item={item} className="aspect-[4/3] w-full" />
                      <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.18em] text-white/90 backdrop-blur">
                        {TYPE_LABEL[item.type] ?? item.type}
                      </span>
                    </div>
                    <div className="p-2.5">
                      <p className="truncate text-xs font-semibold tracking-tight text-foreground">
                        {item.title}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {item.artist ||
                          item.reference ||
                          timeAgo(item._creationTime)}
                      </p>
                      <div className="mt-1 flex items-center gap-3 font-mono text-[9px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Download className="h-2.5 w-2.5" /> {item.downloads}
                        </span>
                        <span className="flex items-center gap-1">
                          <Play className="h-2.5 w-2.5" /> {item.likedBy.length}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              {libTab === "presentations"
                ? `${libraryServices.length} of ${(services ?? []).length} presentations`
                : `${libraryItems.length} of ${catalog.length} items`}
            </p>
          </div>

          {/* Preview box */}
          <aside className="lg:col-span-3">
            {selected ? (
              <div className="rounded-xl border border-border bg-secondary/30 p-3">
                {"type" in selected && selected.type ? (
                  <CoverArt item={selected} className="aspect-video w-full rounded-lg" />
                ) : (
                  <div
                    className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-black"
                    style={{
                      background:
                        "radial-gradient(60% 90% at 50% 0%, oklch(0.6 0.2 292 / 40%), transparent 70%)",
                    }}
                  >
                    <Cross className="h-8 w-8 text-white/80" />
                  </div>
                )}
                <p className="mt-2.5 truncate text-sm font-bold tracking-tight text-foreground">
                  {selected.title}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {"type" in selected && selected.type
                    ? `${TYPE_LABEL[selected.type] ?? selected.type} · ${
                        selected.artist || selected.reference || timeAgo(selected._creationTime)
                      }`
                    : `${formatDate((selected as { date: number }).date)} · ${pluralize(
                        (selected as { items: unknown[] }).items.length,
                        "item",
                      )}`}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="cursor-pointer gap-1.5"
                    onClick={() => projectTitle(selected.title)}
                  >
                    <Play className="h-3.5 w-3.5" /> Project
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="cursor-pointer gap-1.5"
                  >
                    <Link
                      to={
                        "type" in selected && selected.type
                          ? `/dashboard/catalog/${selected._id}`
                          : "/dashboard/services"
                      }
                    >
                      Open <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
                <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
                  Project sends this item to your PewBeam display through the
                  local connector.
                </p>
              </div>
            ) : (
              <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/20 p-5 text-center">
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Select an item to preview it here.
                </p>
              </div>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}
