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
    <nav className="flex flex-col gap-1">
      {filtered.map((n) => {
        const activeCls = (isActive: boolean) =>
          cn(
            "group flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors",
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
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors",
                    isActive
                      ? "border-white/25 bg-white/10 text-white"
                      : "border-sidebar-border bg-sidebar-accent/60 text-muted-foreground group-hover:text-foreground",
                  )}
                >
                  <n.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate text-[13px] leading-4",
                      isActive ? "font-bold" : "font-semibold",
                    )}
                  >
                    {n.label}
                  </span>
                  <span
                    className={cn(
                      "block truncate text-[10px] leading-3.5",
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
    <div className="mt-auto space-y-3 border-t border-sidebar-border pt-4">
      {sub && (
        <NavLink
          to="/dashboard/billing"
          className="block rounded-lg border border-sidebar-border bg-sidebar-accent/50 px-3 py-2.5"
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
          className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-destructive"
          onClick={handleSignOut}
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function SidebarBody({ admin }: { admin: boolean }) {
  const [q, setQ] = useState("");
  return (
    <>
      <div className="flex h-16 items-center border-b border-sidebar-border px-5">
        <NavLink to="/dashboard" className="cursor-pointer">
          <Wordmark compact />
        </NavLink>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search menu items…"
            className="h-9 rounded-lg bg-sidebar-accent/50 pl-8 text-xs"
          />
        </div>
        <NavItems admin={admin} query={q} />
      </div>
      <div className="px-4 pb-5">
        <SidebarFooter />
      </div>
    </>
  );
}

function TopBar({ page }: { page: NavItem | undefined }) {
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
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur sm:px-6">
      {/* Mobile: menu + brand */}
      <div className="flex items-center gap-2 md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="cursor-pointer">
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

      {/* Desktop: page title + badge */}
      <div className="hidden min-w-0 items-center gap-2.5 md:flex">
        <h1 className="truncate text-sm font-bold tracking-tight text-foreground">
          {page?.label ?? "Alpha Worship One"}
        </h1>
        <span className="shrink-0 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-primary">
          {page?.sub ?? "Workspace"}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
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
          className="ml-1 flex cursor-pointer items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-2.5 transition-colors hover:border-primary/40"
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
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <SidebarBody admin={!!isAdmin} />
      </aside>

      <div className="md:pl-64">
        <TopBar page={page} />
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
