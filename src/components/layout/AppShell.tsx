import { useQuery } from "@tanstack/react-query";
import {
  Bell, Flag, LayoutDashboard, LogOut, Package, Route, Search, Settings, Sprout, Truck, UserCheck, Users, Wallet, BarChart3, Megaphone,
} from "lucide-react";
import * as React from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { Avatar } from "@/components/common/parts";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatEthiopian } from "@/lib/ethiopian";
import { formatWeekdayDate } from "@/lib/format";
import type { Dashboard } from "@/lib/types";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
  end?: boolean;
}

function Logo() {
  return (
    <svg viewBox="0 0 100 100" width="30" height="30" className="shrink-0" aria-hidden>
      <defs>
        <mask id="shell-o" maskUnits="userSpaceOnUse" x="-60" y="-60" width="120" height="120">
          <rect x="-60" y="-60" width="120" height="120" fill="white" />
          <path d="M-12 3.8Q3 21.8 18 19.8" fill="none" stroke="black" strokeWidth="20" strokeLinecap="round" />
        </mask>
        <mask id="shell-g" maskUnits="userSpaceOnUse" x="-60" y="-60" width="120" height="120">
          <rect x="-60" y="-60" width="120" height="120" fill="white" />
          <path d="M-18 -19.8Q-3 -21.8 12 -3.8" fill="none" stroke="black" strokeWidth="20" strokeLinecap="round" />
        </mask>
      </defs>
      <g transform="translate(50 50) rotate(-45)" fill="none" strokeLinejoin="round">
        <path d="M-45 0Q-15 -40 15 0Q-15 40 -45 0Z" strokeWidth="14" mask="url(#shell-o)" stroke="var(--color-accent)" />
        <path d="M-15 0Q15 -40 45 0Q15 40 -15 0Z" strokeWidth="14" mask="url(#shell-g)" stroke="var(--color-accent-2-400)" />
      </g>
    </svg>
  );
}

export { Logo };

function useDashboardCounts() {
  return useQuery({
    queryKey: ["dashboard", "TODAY"],
    queryFn: () => api.get<Dashboard>("/admin/dashboard", { period: "TODAY" }),
    refetchInterval: 60_000,
  });
}

function globalSearchTarget(term: string): string {
  const t = term.trim();
  if (/^AL-?\d*/i.test(t)) return `/orders?q=${encodeURIComponent(t.toUpperCase())}`;
  if (/^DSP-?\d*/i.test(t)) return `/disputes?q=${encodeURIComponent(t.toUpperCase())}`;
  return `/users?q=${encodeURIComponent(t)}`;
}

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const dashboard = useDashboardCounts();
  const unread = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => api.get<{ unread: number }>("/notifications/unread-count"),
    refetchInterval: 60_000,
  });
  const searchRef = React.useRef<HTMLInputElement>(null);
  const [term, setTerm] = React.useState("");
  const [mobileNav, setMobileNav] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => setMobileNav(false), [location.pathname]);

  const d = dashboard.data;
  const pending = d ? Object.values(d.pendingVerifications).reduce((a, b) => a + b, 0) : undefined;
  const activeOrders = d
    ? Object.entries(d.ordersByStatus).filter(([s]) => !["COMPLETED", "REJECTED", "CANCELLED", "EXPIRED"].includes(s)).reduce((a, [, n]) => a + n, 0)
    : undefined;

  const items: NavItem[] = [
    { to: "/", label: "Overview", icon: <LayoutDashboard />, end: true },
    { to: "/verification", label: "Verification", icon: <UserCheck />, count: pending },
    { to: "/users", label: "Users", icon: <Users /> },
    { to: "/orders", label: "Orders", icon: <Package />, count: activeOrders },
    { to: "/deliveries", label: "Deliveries", icon: <Truck />, count: d ? d.deliveriesOnTheRoad + d.openDeliveryJobs : undefined },
    { to: "/payments", label: "Payments", icon: <Wallet /> },
    { to: "/disputes", label: "Disputes", icon: <Flag />, count: d?.openDisputes },
    { to: "/listings", label: "Listings", icon: <Sprout /> },
    { to: "/notifications", label: "Notifications", icon: <Megaphone /> },
    { to: "/reports", label: "Reports", icon: <BarChart3 /> },
    { to: "/settings", label: "Settings", icon: <Settings /> },
  ];

  const sidebar = (
    <aside className="flex h-full w-[232px] flex-none flex-col gap-1 bg-sage-800 px-3.5 py-[22px] text-sand-100">
      <div className="flex items-center gap-2.5 px-2.5 pb-5">
        <Logo />
        <span className="font-heading text-lg">AgriLink</span>
        <span className="ml-auto text-[11px] opacity-70">Ops</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto" aria-label="Main">
        {items.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              cn(
                "flex h-[42px] items-center gap-3 rounded-full px-3 text-sm font-semibold transition-colors",
                isActive ? "bg-background text-foreground" : "text-sand-100 hover:bg-sage-700",
              )
            }
            style={{ color: undefined }}
          >
            <span className="[&_svg]:size-[18px]">{n.icon}</span>
            <span className="flex-1">{n.label}</span>
            {n.count ? <span className="text-xs font-bold opacity-85">{n.count}</span> : null}
          </NavLink>
        ))}
      </nav>
      <div className="mt-2 flex items-center gap-2.5 rounded-3xl bg-sage-700 p-3 text-[13px]">
        <Avatar name={user?.fullName ?? "?"} size={34} tone="sage" />
        <div className="min-w-0 flex-1">
          <b className="block truncate">{user?.fullName}</b>
          <span className="opacity-80">Operations</span>
        </div>
        <button
          type="button"
          aria-label="Sign out"
          onClick={() => void logout().then(() => navigate("/login"))}
          className="grid size-8 place-items-center rounded-full hover:bg-sage-800"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </aside>
  );

  const now = new Date();
  return (
    <div className="flex min-h-screen text-foreground">
      <div className="sticky top-0 hidden h-screen lg:block">{sidebar}</div>
      {mobileNav ? (
        <div className="fixed inset-0 z-40 flex lg:hidden" role="dialog" aria-modal>
          <div className="h-full">{sidebar}</div>
          <button aria-label="Close menu" className="flex-1 bg-sand-900/50" onClick={() => setMobileNav(false)} />
        </div>
      ) : null}

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-3.5 border-b border-border px-5 py-4 lg:px-8">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileNav(true)}
            className="grid size-10 place-items-center rounded-full bg-surface lg:hidden"
          >
            <LayoutDashboard className="size-[18px]" />
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sage-100 px-3.5 py-[7px] text-[13px] font-bold text-sage-800">
            <Route className="size-3.5" />Oromia → Addis Ababa
          </span>
          <span className="text-[13px] text-sand-700">
            {formatWeekdayDate(now)} · <span lang="am" className="font-['Noto_Sans_Ethiopic']">{formatEthiopian(now)}</span>
          </span>
          <div className="flex-1" />
          <form
            role="search"
            className="flex h-10 w-[min(320px,100%)] items-center gap-2 rounded-full bg-surface px-4 text-sm text-sand-700"
            onSubmit={(e) => {
              e.preventDefault();
              if (term.trim()) {
                navigate(globalSearchTarget(term));
                setTerm("");
                searchRef.current?.blur();
              }
            }}
          >
            <Search className="size-4" />
            <input
              ref={searchRef}
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Order, phone, name…"
              aria-label="Search orders, disputes or people"
              className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-sand-700"
            />
            <kbd className="rounded-md border border-border px-1.5 text-[11px]">/</kbd>
          </form>
          <button
            type="button"
            aria-label={`Notifications${unread.data?.unread ? `, ${unread.data.unread} unread` : ""}`}
            onClick={() => navigate("/notifications")}
            className="relative grid size-10 place-items-center rounded-full bg-surface"
          >
            <Bell className="size-[18px]" />
            {unread.data?.unread ? <span className="absolute right-2 top-2 size-2 rounded-full bg-primary" /> : null}
          </button>
        </header>
        <div className="flex flex-1 flex-col gap-8 px-5 pb-14 pt-7 lg:px-8">
          <React.Suspense fallback={<div className="flex flex-col gap-3"><Skeleton className="h-10 w-64" /><Skeleton className="h-40 w-full" /></div>}>
            <Outlet />
          </React.Suspense>
        </div>
      </main>
    </div>
  );
}
