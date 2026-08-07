import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import Workspace from "./Workspace";
import { useAuth } from "@/hooks/use-auth";
import { Wordmark } from "@/components/wordmark";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useObs } from "@/lib/obs";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";
import { toast } from "sonner";
import {
  Bell,
  Cable,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  Library,
  ListOrdered,
  LogOut,
  Maximize,
  Menu,
  Minimize,
  MonitorPlay,
  Radio,
  ScanText,
  Search,
  Settings,
  ShieldCheck,
  UploadCloud,
  Wifi,
  WifiOff,
} from "lucide-react";

const NAV = [
  { to: "/dashboard/overview", label: "Dashboard", sub: "Overview & analytics", icon: LayoutDashboard, end: false },
  { to: "/dashboard", label: "Presentation Console", sub: "Fixed operator workspace", icon: MonitorPlay, end: true },
  { to: "/dashboard/control", label: "Live Stream Studio", sub: "Go live & manage streams", icon: Radio, end: false },
  { to: "/dashboard/scripture", label: "Sermons Library", sub: "Manage & organize sermons", icon: ScanText, end: false },
  { to: "/dashboard/catalog", label: "Media Library", sub: "Videos · songs · images", icon: Library, end: false },
  { to: "/dashboard/services", label: "Services", sub: "Plan the run-of-show", icon: ListOrdered, end: false },
  { to: "/dashboard/integrations", label: "Integrations", sub: "Connect your stack", icon: Cable, end: false },
  { to: "/dashboard/upload", label: "Upload", sub: "Publish your content", icon: UploadCloud, end: false },
  { to: "/dashboard/billing", label: "Billing", sub: "Plans & payments", icon: CreditCard, end: false },
  { to: "/dashboard/admin", label: "Admin", sub: "Workspace administration", icon: ShieldCheck, end: false, admin: true },
  { to: "/dashboard/settings", label: "Settings", sub: "General settings", icon: Settings, end: false },
] as const;

type NavItem = (typeof NAV)[number];

function NavItems({ admin, query }: { admin: boolean; query: string }) {
  const q = query.trim().toLowerCase();
  const items = NAV.filter((n) => !("admin" in n) || n.admin === undefined || admin);
  const filtered = q
    ? items.filter((n) => `${n.label} ${n.sub}`.toLowerCase().includes(q))
    : items;

  if (filtered.length === 0) {
    return (
      <p className="px-3 py-2 text-xs text-muted-foreground">
        No matching items
      </p>
    );
  }

  return (
    <nav className="flex flex-col gap-0.5">
      {filtered.map((n) => {
        const activeCls = (isActive: boolean) =>
          cn(
            "group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-colors",
            isActive
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
          );
        return (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) => activeCls(isActive)}
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors",
                    isActive
                      ? "border-white/25 bg-white/10 text-white"
                      : "border-sidebar-border bg-sidebar-accent/60 text-muted-foreground group-hover:text-foreground",
                  )}
                >
                  <n.icon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate text-[12px] leading-4",
                      isActive ? "font-bold" : "font-semibold",
                    )}
                  >
                    {n.label}
                  </span>
                  <span
                    className={cn(
                      "block truncate text-[9px] leading-3",
                      isActive ? "text-white/75" : "text-muted-foreground/80",
                    )}
                  >
                    {n.sub}
                  </span>
                </span>
                {n.to === "/dashboard/billing" && !isActive && (
                  <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-60" />
                )}
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}

function SidebarFooter() {
  const { user, signOut } = useAuth();
  const sub = useQuery(api.subscriptions.mySubscription);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="mt-auto space-y-3 border-t border-sidebar-border pt-3">
      {sub && (
        <NavLink
          to="/dashboard/billing"
          className="block rounded-lg border border-sidebar-border bg-sidebar-accent/50 px-3 py-2"
        >
          <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
            {sub.access === "pro"
              ? sub.trialActive
                ? "Pro trial"
                : "Pro plan"
              : "Free plan"}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-foreground">
            {sub.access === "pro"
              ? sub.trialActive
                ? `${sub.daysLeft} days left`
                : "Active"
              : sub.trialExpired
                ? "Upgrade to Pro"
                : "Start free trial"}
          </p>
        </NavLink>
      )}
      <div className="flex items-center gap-2.5">
        <Avatar className="h-8 w-8 border border-sidebar-border">
          <AvatarFallback className="bg-primary text-xs text-primary-foreground">
            {initials(user?.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-foreground">
            {user?.name || "Media operator"}
          </p>
          <p className="truncate font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
            {user?.role ?? "member"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 cursor-pointer text-muted-foreground hover:text-destructive"
          onClick={handleSignOut}
          title="Sign out"
        >
          <LogOut className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function SidebarBody({ admin }: { admin: boolean }) {
  const [q, setQ] = useState("");
  return (
    <>
      <div className="flex h-12 shrink-0 items-center border-b border-sidebar-border px-4">
        <NavLink to="/dashboard" className="cursor-pointer">
          <Wordmark compact />
        </NavLink>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-3">
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search menu…"
            className="h-8 rounded-md bg-sidebar-accent/50 pl-8 text-xs"
          />
        </div>
        <NavItems admin={admin} query={q} />
      </div>
      <div className="shrink-0 px-3 pb-3">
        <SidebarFooter />
      </div>
    </>
  );
}

/** Native-style title bar: page identity on the left, window actions on the right. */
function TitleBar({ page }: { page: NavItem | undefined }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen().catch(() => undefined);
    }
  };

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-card/70 px-3 backdrop-blur">
      {/* Mobile: menu + brand */}
      <div className="flex items-center gap-1.5 md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8 cursor-pointer">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex w-72 flex-col bg-sidebar p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarBody admin={user?.role === "admin"} />
          </SheetContent>
        </Sheet>
        <NavLink to="/dashboard" className="cursor-pointer">
          <Wordmark compact />
        </NavLink>
      </div>

      {/* Desktop: app title + page */}
      <div className="hidden min-w-0 items-center gap-2 md:flex">
        <Wordmark compact />
        <span className="mx-1 h-4 w-px bg-border" />
        <h1 className="truncate text-[13px] font-bold tracking-tight text-foreground">
          {page?.label ?? "Alpha Worship One"}
        </h1>
        <span className="shrink-0 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.2em] text-primary">
          {page?.sub ?? "Workspace"}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground"
          onClick={() => toast("No new notifications yet")}
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground"
          onClick={toggleFullscreen}
          title={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {fullscreen ? (
            <Minimize className="h-4 w-4" />
          ) : (
            <Maximize className="h-4 w-4" />
          )}
        </Button>
        <button
          onClick={() => navigate("/dashboard/settings")}
          className="ml-1 flex cursor-pointer items-center gap-2 rounded-full border border-border bg-card py-0.5 pl-0.5 pr-2 transition-colors hover:border-primary/40"
          title="Profile & settings"
        >
          <Avatar className="h-6 w-6">
            <AvatarFallback className="bg-primary text-[10px] text-primary-foreground">
              {initials(user?.name)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-xs font-semibold text-foreground sm:block">
            {user?.name || "Operator"}
          </span>
        </button>
      </div>
    </header>
  );
}

/** Live clock — the small detail that makes the frame feel like a native app. */
function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
      {now.toLocaleTimeString("en-US", { hour12: false })}
      <span className="hidden lg:inline">
        {" · "}
        {now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
      </span>
    </span>
  );
}

/** Desktop-app status bar: live connection state across the bottom edge. */
function StatusBar() {
  const connections = useQuery(api.connections.list);
  const sub = useQuery(api.subscriptions.mySubscription);
  const obs = useObs();
  const navigate = useNavigate();

  const obsConn = (connections ?? []).find((c) => c.app === "obs");
  const pewbeam = (connections ?? []).find((c) => c.app === "pewbeam" && c.url);
  const targets = useQuery(api.streams.list);

  const obsOnline = obs.status === "connected";
  const obsLabel = obsOnline
    ? obs.streaming
      ? "LIVE"
      : obs.currentScene
        ? `Scene · ${obs.currentScene}`
        : "Connected"
    : obs.status === "connecting"
      ? "Connecting…"
      : obs.status === "error"
        ? "OBS error"
        : obsConn?.enabled
          ? "OBS configured"
          : "OBS offline";

  const planLabel =
    sub?.access === "pro"
      ? sub.trialActive
        ? "PRO TRIAL"
        : "PRO"
      : sub?.trialExpired
        ? "UPGRADE"
        : "FREE";

  return (
    <footer className="flex h-8 shrink-0 items-center gap-3 overflow-x-auto border-t border-border bg-card/70 px-3 backdrop-blur">
      <span className="flex shrink-0 items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            obsOnline ? "bg-emerald-400" : "bg-muted-foreground/40",
          )}
        />
        Alpha Worship One
      </span>

      <span className="hidden h-3 w-px shrink-0 bg-border sm:block" />

      {/* OBS */}
      <button
        onClick={() => navigate("/dashboard/control")}
        className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        title="Open Live Stream Studio"
      >
        {obsOnline ? <Wifi className="h-3 w-3 text-emerald-400" /> : <WifiOff className="h-3 w-3 text-muted-foreground/60" />}
        <span className={obsOnline && obs.streaming ? "text-red-400" : obsOnline ? "text-emerald-400" : ""}>
          {obsLabel}
        </span>
      </button>

      {/* PewBeam */}
      <button
        onClick={() => navigate("/dashboard/integrations")}
        className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        title="Open Integrations"
      >
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            pewbeam ? "bg-emerald-400" : "bg-muted-foreground/40",
          )}
        />
        {pewbeam ? "PewBeam ready" : "PewBeam not set"}
      </button>

      {/* Stream targets */}
      <span className="hidden shrink-0 items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground md:flex">
        <Radio className="h-3 w-3 text-muted-foreground/60" />
        {(targets ?? []).length} target{(targets ?? []).length === 1 ? "" : "s"}
      </span>

      <span className="ml-auto flex shrink-0 items-center gap-3">
        <span
          className={cn(
            "rounded border px-1.5 py-px font-mono text-[8px] uppercase tracking-[0.18em]",
            sub?.access === "pro"
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border text-muted-foreground",
          )}
        >
          {planLabel}
        </span>
        <LiveClock />
      </span>
    </footer>
  );
}

export default function DashboardLayout() {
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === "admin";
  const seedDemo = useMutation(api.catalog.seedDemo);
  const ensureTrial = useMutation(api.subscriptions.ensureTrial);
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) return;
    seedDemo().catch(() => undefined);
    ensureTrial().catch(() => undefined);
  }, [isAuthenticated, seedDemo, ensureTrial]);

  // The dashboard root is the fixed, app-like presentation console.
  if (location.pathname === "/dashboard") {
    return <Workspace />;
  }

  const page = NAV.find((n) =>
    n.end
      ? location.pathname === n.to
      : location.pathname.startsWith(n.to),
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <SidebarBody admin={!!isAdmin} />
      </aside>

      {/* App column: title bar · content · status bar */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TitleBar page={page} />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 md:px-7">
            <Outlet />
          </div>
        </main>
        <StatusBar />
      </div>
    </div>
  );
}
