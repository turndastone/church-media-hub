import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Wordmark } from "@/components/wordmark";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";
import {
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  Library,
  ListOrdered,
  LogOut,
  Menu,
  Radio,
  ScanText,
  Settings,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

const NAV = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/dashboard/control", label: "Control Room", icon: Radio, end: false },
  { to: "/dashboard/services", label: "Services", icon: ListOrdered, end: false },
  { to: "/dashboard/catalog", label: "Catalog", icon: Library, end: false },
  { to: "/dashboard/scripture", label: "Scripture", icon: ScanText, end: false },
  { to: "/dashboard/upload", label: "Upload", icon: UploadCloud, end: false },
  { to: "/dashboard/billing", label: "Billing", icon: CreditCard, end: false },
  { to: "/dashboard/admin", label: "Admin", icon: ShieldCheck, end: false, admin: true },
  { to: "/dashboard/settings", label: "Settings", icon: Settings, end: false },
] as const;

function NavItems({ admin }: { admin: boolean }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.filter((n) => !("admin" in n) || n.admin === undefined || admin).map(
        (n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors",
                "hover:bg-sidebar-accent hover:text-sidebar-foreground",
                isActive &&
                  "bg-sidebar-accent text-sidebar-foreground",
              )
            }
          >
            <n.icon className="h-4 w-4 shrink-0" />
            {n.label}
            {n.to === "/dashboard/billing" && (
              <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-60" />
            )}
          </NavLink>
        ),
      )}
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
          <AvatarFallback className="bg-sidebar-accent text-xs text-sidebar-foreground">
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
  return (
    <>
      <div className="flex h-16 items-center border-b border-sidebar-border px-5">
        <NavLink to="/dashboard" className="cursor-pointer">
          <Wordmark compact />
        </NavLink>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-5">
        <p className="tech-label mb-2 px-3">Workspace</p>
        <NavItems admin={admin} />
      </div>
      <div className="px-4 pb-5">
        <SidebarFooter />
      </div>
    </>
  );
}

export default function DashboardLayout() {
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === "admin";
  const seedDemo = useMutation(api.catalog.seedDemo);
  const ensureTrial = useMutation(api.subscriptions.ensureTrial);

  useEffect(() => {
    if (!isAuthenticated) return;
    seedDemo().catch(() => undefined);
    ensureTrial().catch(() => undefined);
  }, [isAuthenticated, seedDemo, ensureTrial]);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur md:hidden">
        <NavLink to="/dashboard" className="cursor-pointer">
          <Wordmark compact />
        </NavLink>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="cursor-pointer">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex w-72 flex-col bg-sidebar p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarBody admin={!!isAdmin} />
          </SheetContent>
        </Sheet>
      </header>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar md:flex lg:w-64">
        <SidebarBody admin={!!isAdmin} />
      </aside>

      <div className="md:pl-60 lg:pl-64">
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
