import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useAction, useQuery } from "convex/react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { Wordmark } from "@/components/wordmark";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { connectorClient } from "@/lib/integrations";
import { initials } from "@/lib/format";
import { WorkspaceContext, VERSIONS, type Slide, type TabKey } from "./workspace/context";
import ScripturePanel from "./workspace/ScripturePanel";
import SongPanel from "./workspace/SongPanel";
import ThemePanel from "./workspace/ThemePanel";
import PresentationsPanel from "./workspace/PresentationsPanel";
import MediaPanel from "./workspace/MediaPanel";
import ProgramPreview from "./workspace/ProgramPreview";

/** Fallback caption feed so the overlay demos even before any sermon is saved. */
const DEMO_CAPTION_FEED =
  "Good morning and welcome to our service today. We're so glad you're here with us this morning. Let's turn our hearts to the Lord as we open in prayer. Our scripture reading this morning comes from the gospel of John. For God so loved the world that He gave His only Son. Let every heart prepare Him room as we worship together today.";
import {
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Eraser,
  Image as ImageIcon,
  LayoutDashboard,
  Library,
  ListOrdered,
  ListVideo,
  LogOut,
  MonitorPlay,
  Music2,
  Palette,
  Plug,
  Projector,
  Radio,
  ScanText,
  Send,
  Settings,
  ShieldCheck,
  Loader2,
  Square,
  UploadCloud,
  Video,
  X,
} from "lucide-react";

const TABS: { key: TabKey; label: string; icon: typeof BookOpenText }[] = [
  { key: "scripture", label: "Scripture", icon: BookOpenText },
  { key: "song", label: "Song", icon: Music2 },
  { key: "theme", label: "Theme", icon: Palette },
  { key: "presentations", label: "Presentations", icon: ListVideo },
  { key: "media", label: "Image / Video", icon: ImageIcon },
];

const KIND_ICON: Record<Slide["kind"], typeof BookOpenText> = {
  verse: BookOpenText,
  song: Music2,
  theme: Palette,
  media: ImageIcon,
  note: ScanText,
  black: Square,
};

// Dashboards opened as overlay panels that cover part of the console.
const ControlRoomOverlay = lazy(() => import("./ControlRoom"));
const ScriptureOverlay = lazy(() => import("./Scripture"));

const MANAGEMENT = [
  { to: "/dashboard/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/dashboard/control", label: "Control Room", icon: Radio },
  { to: "/dashboard/integrations", label: "Integrations", icon: Plug },
  { to: "/dashboard/services", label: "Services", icon: ListOrdered },
  { to: "/dashboard/catalog", label: "Catalog", icon: Library },
  { to: "/dashboard/upload", label: "Upload", icon: UploadCloud },
  { to: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function Workspace() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const connections = useQuery(api.connections.list);
  const sub = useQuery(api.subscriptions.mySubscription);
  const transcripts = useQuery(api.transcripts.list);
  const getSecrets = useAction(api.connections.secrets);

  const [activeTab, setActiveTab] = useState<TabKey>("scripture");
  const [version, setVersion] = useState("KJV");
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [overlay, setOverlay] = useState<"control" | "scripture" | null>(null);
  const [captionsOn, setCaptionsOn] = useState(false);
  const idCounter = useRef(0);

  // Live caption feed: latest saved transcript, falling back to a demo feed.
  const latestTranscript = (transcripts ?? [])
    .slice()
    .sort((a, b) => b._creationTime - a._creationTime)[0];
  const captionText = latestTranscript?.sourceText || DEMO_CAPTION_FEED;

  useEffect(() => {
    if (!overlay) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOverlay(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlay]);

  const pewbeam = (connections ?? []).find((c) => c.app === "pewbeam" && c.url) ?? null;
  const activeSlide: Slide | null = activeIndex >= 0 ? slides[activeIndex] ?? null : null;

  const queueSlide = (s: Omit<Slide, "id">) => {
    const slide: Slide = { ...s, id: `s${++idCounter.current}` };
    const nextIndex = slides.length;
    setSlides((prev) => [...prev, slide]);
    setActiveIndex(nextIndex);
  };

  const selectSlide = (i: number) => setActiveIndex(i);

  const step = (dir: -1 | 1) => {
    setActiveIndex((prev) => {
      if (slides.length === 0) return -1;
      return Math.min(slides.length - 1, Math.max(0, (prev < 0 ? 0 : prev) + dir));
    });
  };

  const clearSlides = () => {
    setSlides([]);
    setActiveIndex(-1);
  };

  const blackOut = () => {
    queueSlide({ kind: "black", title: "Black" });
  };

  const sendToDisplay = async (s: Slide) => {
    if (!pewbeam?.url) {
      toast.error("Configure the PewBeam connector first — Control Room → Integrations.");
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
      {
        app: "pewbeam",
        action: "show",
        payload: {
          kind: s.kind,
          title: s.title,
          text: s.body,
          reference: s.kind === "verse" ? s.title : undefined,
        },
      },
      token,
    );
    if (res.ok) {
      toast.success(`Sent “${s.title}” to the display`);
    } else {
      toast.error(res.message);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const trialLabel =
    sub?.access === "pro"
      ? sub.trialActive
        ? `Pro trial · ${sub.daysLeft}d left`
        : "Pro plan"
      : sub?.trialExpired
        ? "Upgrade to Pro"
        : "Free plan";

  return (
    <WorkspaceContext.Provider
      value={{
        version,
        setVersion,
        queueSlide,
        sendToDisplay,
        pewbeamUrl: pewbeam?.url ?? null,
      }}
    >
      <div className="relative flex h-screen flex-col overflow-hidden bg-background">
        {/* ── Top application bar ─────────────────────────────────────── */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card/60 px-3 backdrop-blur">
          <Wordmark compact />
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setOverlay((o) => (o === "control" ? null : "control"))}
              title="Live stream dashboard"
            >
              <Video className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setOverlay((o) => (o === "scripture" ? null : "scripture"))}
              title="Bible verse transcription dashboard"
            >
              <ScanText className="h-4 w-4" />
            </Button>
          </div>
          <div className="mx-2 hidden h-6 w-px bg-border sm:block" />
          <nav className="flex items-center gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  "flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors",
                  activeTab === t.key
                    ? "bg-accent/15 text-accent"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {sub && (
              <button
                onClick={() => navigate("/dashboard/billing")}
                className={cn(
                  "hidden cursor-pointer rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] transition-colors sm:block",
                  sub.access === "pro"
                    ? "border-accent/40 bg-accent/10 text-accent"
                    : "border-border text-muted-foreground hover:border-accent/30",
                )}
              >
                {trialLabel}
              </button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 cursor-pointer"
                  title="Workspace management"
                >
                  <LayoutDashboard className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                  Management
                </DropdownMenuLabel>
                {MANAGEMENT.map((m) => (
                  <DropdownMenuItem
                    key={m.to}
                    className="cursor-pointer gap-2"
                    onSelect={() => navigate(m.to)}
                  >
                    <m.icon className="h-3.5 w-3.5" /> {m.label}
                  </DropdownMenuItem>
                ))}
                {user?.role === "admin" && (
                  <DropdownMenuItem
                    className="cursor-pointer gap-2"
                    onSelect={() => navigate("/dashboard/admin")}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" /> Admin
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer gap-2 text-destructive" onSelect={handleSignOut}>
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Avatar className="hidden h-8 w-8 border border-border sm:flex">
              <AvatarFallback className="bg-secondary text-xs text-foreground">
                {initials(user?.name)}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* ── Body: bible rail · workspace · preview ───────────────────── */}
        <div className="flex min-h-0 flex-1">
          {/* Bible version rail */}
          <aside className="hidden w-24 shrink-0 flex-col overflow-y-auto border-r border-border bg-card/40 p-2 md:flex">
            <p className="px-1.5 pb-2 font-mono text-[8px] uppercase tracking-[0.2em] text-muted-foreground">
              Versions
            </p>
            {VERSIONS.map((v) => (
              <button
                key={v.abbr}
                onClick={() => setVersion(v.abbr)}
                title={v.name}
                className={cn(
                  "cursor-pointer rounded-lg px-1.5 py-1.5 text-left transition-colors",
                  version === v.abbr
                    ? "bg-accent/15"
                    : "hover:bg-secondary",
                )}
              >
                <p
                  className={cn(
                    "font-mono text-[10px] font-bold uppercase tracking-[0.14em]",
                    version === v.abbr ? "text-accent" : "text-foreground",
                  )}
                >
                  {v.abbr}
                </p>
                <p className="mt-0.5 truncate text-[8px] leading-3 text-muted-foreground">
                  {v.name}
                </p>
              </button>
            ))}
          </aside>

          {/* Central workspace */}
          <main className="min-w-0 flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                className="h-full"
              >
                {activeTab === "scripture" && <ScripturePanel />}
                {activeTab === "song" && <SongPanel />}
                {activeTab === "theme" && <ThemePanel />}
                {activeTab === "presentations" && <PresentationsPanel />}
                {activeTab === "media" && <MediaPanel />}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Preview + controls */}
          <aside className="hidden w-[300px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-border bg-card/40 p-3 md:flex xl:w-[340px]">
            <div>
              <p className="tech-label mb-2">Preview · Program output</p>
              <ProgramPreview
                slide={activeSlide}
                captionText={captionText}
                captionsOn={captionsOn}
              />
              <button
                onClick={() => setCaptionsOn((v) => !v)}
                className={cn(
                  "mt-2 flex w-full cursor-pointer items-center justify-between rounded-lg border px-3 py-1.5 transition-colors",
                  captionsOn
                    ? "border-accent/40 bg-accent/10"
                    : "border-border bg-secondary/30 hover:border-accent/40",
                )}
              >
                <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                  <ScanText className="h-3 w-3" /> Live captions
                </span>
                <span
                  className={cn(
                    "relative h-3.5 w-7 rounded-full transition-colors",
                    captionsOn ? "bg-accent/70" : "bg-secondary",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white shadow transition-all",
                      captionsOn ? "left-4" : "left-0.5",
                    )}
                  />
                </span>
              </button>
            </div>

            {activeSlide && (
              <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2">
                <p className="truncate text-xs font-semibold text-foreground">{activeSlide.title}</p>
                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                  {activeSlide.kind}
                  {activeSlide.sub ? ` · ${activeSlide.sub}` : ""}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button
                className="col-span-2 cursor-pointer gap-1.5"
                onClick={() => activeSlide && sendToDisplay(activeSlide)}
                disabled={!activeSlide}
              >
                <Send className="h-3.5 w-3.5" /> Send to display
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer gap-1.5"
                onClick={blackOut}
              >
                <Square className="h-3.5 w-3.5" /> Black
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer gap-1.5"
                onClick={clearSlides}
                disabled={slides.length === 0}
              >
                <Eraser className="h-3.5 w-3.5" /> Clear strip
              </Button>
            </div>

            <div className="mt-1 rounded-lg border border-border p-3">
              <p className="tech-label mb-2">Connections</p>
              <button
                onClick={() => navigate("/dashboard/control")}
                className="flex w-full cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-secondary"
              >
                <MonitorPlay className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="flex-1 text-[11px] text-foreground">OBS Studio</span>
                <span className="font-mono text-[9px] text-muted-foreground">→</span>
              </button>
              <div className="mt-1 flex items-center gap-2 px-1.5 py-1.5">
                <Radio className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="flex-1 text-[11px] text-foreground">PewBeam</span>
                <span
                  className={cn(
                    "font-mono text-[9px] uppercase tracking-[0.12em]",
                    pewbeam ? "text-emerald-400" : "text-muted-foreground",
                  )}
                >
                  {pewbeam ? "Ready" : "Not set"}
                </span>
              </div>
            </div>
          </aside>
        </div>

        {/* ── Slide control bar ─────────────────────────────────────────── */}
        <footer className="flex h-16 shrink-0 items-center gap-2 border-t border-border bg-card/60 px-3 backdrop-blur">
          <Button
            className="shrink-0 cursor-pointer gap-1.5"
            onClick={() => activeSlide && sendToDisplay(activeSlide)}
            disabled={!activeSlide}
            title="Push the active slide (song, theme, presentation, scripture) to the projector"
          >
            <Projector className="h-4 w-4" />
            <span className="hidden sm:inline">Project</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0 cursor-pointer"
            onClick={() => step(-1)}
            disabled={activeIndex <= 0}
            title="Previous slide"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0 cursor-pointer"
            onClick={() => step(1)}
            disabled={activeIndex >= slides.length - 1}
            title="Next slide"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <div className="mx-1 hidden h-6 w-px bg-border sm:block" />

          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-1">
            {slides.length === 0 ? (
              <p className="px-1 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                Slide strip empty — queue content from the workspace
              </p>
            ) : (
              slides.map((s, i) => {
                const Icon = KIND_ICON[s.kind];
                return (
                  <button
                    key={s.id}
                    onClick={() => selectSlide(i)}
                    className={cn(
                      "flex h-12 w-24 shrink-0 cursor-pointer flex-col items-start justify-between rounded-md border p-1.5 text-left transition-colors",
                      i === activeIndex
                        ? "border-accent/60 bg-accent/15"
                        : "border-border bg-card hover:border-accent/40",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-3 w-3",
                        i === activeIndex ? "text-accent" : "text-muted-foreground",
                      )}
                    />
                    <span className="w-full truncate text-[9px] font-semibold leading-3 text-foreground">
                      {s.title}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <span className="hidden shrink-0 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground sm:block">
            {slides.length === 0 ? "0 / 0" : `${activeIndex + 1} / ${slides.length}`}
          </span>
        </footer>

        {/* ── Dashboard overlay (covers part of the console) ──────────── */}
        <AnimatePresence>
          {overlay && (
            <>
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 z-40 bg-black/50"
                onClick={() => setOverlay(null)}
              />
              <motion.div
                key="panel"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 32, stiffness: 320 }}
                className="absolute inset-y-0 right-0 z-50 flex w-[88%] max-w-[920px] flex-col overflow-hidden border-l border-border bg-background"
              >
                <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border px-4">
                  <div className="flex min-w-0 items-center gap-2">
                    {overlay === "control" ? (
                      <Video className="h-4 w-4 shrink-0 text-accent" />
                    ) : (
                      <ScanText className="h-4 w-4 shrink-0 text-accent" />
                    )}
                    <p className="truncate font-mono text-[10px] uppercase tracking-[0.2em] text-foreground">
                      {overlay === "control"
                        ? "Live stream dashboard"
                        : "Bible verse transcription dashboard"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
                    onClick={() => setOverlay(null)}
                    title="Close (Esc)"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <Suspense
                    fallback={
                      <div className="flex items-center gap-2 p-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading dashboard…
                      </div>
                    }
                  >
                    {overlay === "control" ? <ControlRoomOverlay /> : <ScriptureOverlay />}
                  </Suspense>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </WorkspaceContext.Provider>
  );
}
