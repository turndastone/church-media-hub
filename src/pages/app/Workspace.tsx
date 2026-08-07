import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "convex/react";
import { useRef, useState } from "react";
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
import { initials } from "@/lib/format";
import { WorkspaceContext, VERSIONS, type Slide, type TabKey } from "./workspace/context";
import ScripturePanel from "./workspace/ScripturePanel";
import SongPanel from "./workspace/SongPanel";
import ThemePanel from "./workspace/ThemePanel";
import PresentationsPanel from "./workspace/PresentationsPanel";
import MediaPanel from "./workspace/MediaPanel";
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
  Projector,
  Radio,
  ScanText,
  Send,
  Settings,
  ShieldCheck,
  Square,
  UploadCloud,
  Video,
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

const MANAGEMENT = [
  { to: "/dashboard/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/dashboard/control", label: "Control Room", icon: Radio },
  { to: "/dashboard/services", label: "Services", icon: ListOrdered },
  { to: "/dashboard/catalog", label: "Catalog", icon: Library },
  { to: "/dashboard/upload", label: "Upload", icon: UploadCloud },
  { to: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
];

function PreviewCanvas({ slide }: { slide: Slide | null }) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
      {!slide || slide.kind === "black" ? (
        <div className="absolute inset-0 bg-black" />
      ) : slide.kind === "media" && slide.mediaUrl ? (
        <img
          src={slide.mediaUrl}
          alt={slide.title}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : slide.kind === "theme" ? (
        <div
          className="absolute inset-0"
          style={{
            background: slide.accent
              ? `linear-gradient(135deg, ${slide.accent}, #0a0a0f)`
              : "linear-gradient(135deg, #18181b, #09090b)",
          }}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 p-8 text-center">
          <p className="text-lg font-semibold tracking-tight text-white sm:text-2xl">
            {slide.title}
          </p>
          {slide.sub && (
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/50">
              {slide.sub}
            </p>
          )}
          {slide.body && (
            <p className="max-w-md text-xs leading-6 text-white/85 sm:text-sm">
              {slide.body}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function Workspace() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const connections = useQuery(api.connections.list);
  const sub = useQuery(api.subscriptions.mySubscription);

  const [activeTab, setActiveTab] = useState<TabKey>("scripture");
  const [version, setVersion] = useState("KJV");
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const idCounter = useRef(0);

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
      toast.error("Configure the Pewbeam hook in Control Room → Connections first.");
      return;
    }
    try {
      await fetch(pewbeam.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(pewbeam.token ? { Authorization: `Bearer ${pewbeam.token}` } : {}),
        },
        body: JSON.stringify({
          action: "show",
          token: pewbeam.token ?? null,
          payload: {
            kind: s.kind,
            title: s.title,
            text: s.body,
            reference: s.kind === "verse" ? s.title : undefined,
          },
        }),
      });
      toast.success(`Sent “${s.title}” to the display`);
    } catch (e) {
      toast.error(`Pewbeam request failed: ${(e as Error).message}`);
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
        pewbeamToken: pewbeam?.token ?? null,
      }}
    >
      <div className="flex h-screen flex-col overflow-hidden bg-background">
        {/* ── Top application bar ─────────────────────────────────────── */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card/60 px-3 backdrop-blur">
          <Wordmark compact />
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => window.open("/dashboard/control", "_blank", "noopener,noreferrer")}
              title="Live stream dashboard — opens in a new window"
            >
              <Video className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => window.open("/dashboard/scripture", "_blank", "noopener,noreferrer")}
              title="Bible verse transcription dashboard — opens in a new window"
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
              <p className="tech-label mb-2">Preview</p>
              <PreviewCanvas slide={activeSlide} />
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
                <span className="flex-1 text-[11px] text-foreground">Pewbeam</span>
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
      </div>
    </WorkspaceContext.Provider>
  );
}
