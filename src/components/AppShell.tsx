import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Fragment, type ReactNode } from "react";
import {
  Home, Search, CalendarCheck, MessageCircle, User, LayoutDashboard, ClipboardList,
  CalendarDays, Wrench, BarChart3, Bell, Shield, Menu, LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import brandAsset from "@/assets/besbi-brand.png.asset.json";

const clientNav = [
  { to: "/", label: "Accueil", icon: Home },
  { to: "/recherche", label: "Rechercher", icon: Search },
  { to: "/reservations", label: "Réservations", icon: CalendarCheck },
  { to: "/messages", label: "Messages", icon: MessageCircle },
  { to: "/profil", label: "Profil", icon: User },
] as const;

const proNav = [
  { to: "/pro", label: "Dashboard", icon: LayoutDashboard },
  { to: "/pro/commandes", label: "Commandes", icon: ClipboardList },
  { to: "/pro/calendrier", label: "Calendrier", icon: CalendarDays },
  { to: "/pro/services", label: "Services", icon: Wrench },
  { to: "/pro/stats", label: "Stats", icon: BarChart3 },
] as const;

const clientPrimary = [clientNav[0], clientNav[1], clientNav[2]] as const;
const clientMore = [clientNav[3], clientNav[4]] as const;
const proPrimary = proNav.slice(0, 4);
const proMore = [
  ...proNav.slice(4),
  { to: "/pro/profil", label: "Profil pro", icon: User },
] as const;

export function Logo() {
  return (
    <Link to="/" className="flex shrink-0 items-center" aria-label="Bës bi — Accueil">
      <img src={brandAsset.url} alt="Bës bi" className="h-12 w-[82px] object-contain md:h-14 md:w-24" />
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isPro = pathname.startsWith("/pro");
  const nav = isPro ? proNav : clientNav;
  const mobileNav = isPro ? proPrimary : clientPrimary;
  const moreNav = isPro ? proMore : clientMore;
  const moreActive = moreNav.some((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Vous êtes déconnecté");
    navigate({ to: "/", replace: true });
  }

  const { data: unread = 0 } = useQuery({
    queryKey: ["unread", user?.id],
    enabled: !!user,
    refetchInterval: 30000,
    queryFn: async () => {
      const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("read", false);
      return count ?? 0;
    },
  });

  return (
    <div className="min-h-screen pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Logo />
          <nav className="ml-6 hidden gap-1 md:flex">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} activeOptions={{ exact: n.to === "/" || n.to === "/pro" }}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
                activeProps={{ className: "rounded-lg px-3 py-2 text-sm font-semibold bg-ink text-ink-foreground" }}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {roles.includes("admin") && (
              <Link to="/admin" className="rounded-lg p-2 hover:bg-muted" aria-label="Administration"><Shield className="h-5 w-5" /></Link>
            )}
            {user && roles.includes("provider") && (
              <button onClick={() => navigate({ to: isPro ? "/" : "/pro" })}
                className="rounded-full border-2 border-ink px-3 py-1.5 text-xs font-bold">
                {isPro ? "Mode client" : "Espace pro"}
              </button>
            )}
            {user ? (
              <Link to="/notifications" className="relative rounded-lg p-2 hover:bg-muted" aria-label="Notifications">
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                  <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{unread}</span>
                )}
              </Link>
            ) : (
              <Link to="/auth" className="rounded-full bg-ink px-4 py-2 text-sm font-bold text-ink-foreground">Se connecter</Link>
            )}
            {user && (
              <button onClick={() => void signOut()} className="hidden rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-destructive md:block" aria-label="Se déconnecter" title="Se déconnecter">
                <LogOut className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </header>
      <main>{children}</main>
      <nav aria-label="Navigation principale" className="fixed inset-x-0 bottom-0 z-40 border-t border-sidebar-border bg-ink pb-[env(safe-area-inset-bottom)] text-ink-foreground md:hidden">
        <div className={`grid ${isPro ? "grid-cols-5" : "grid-cols-4"}`}>
          {mobileNav.map((n) => (
            <Fragment key={n.to}>
              <Link to={n.to} activeOptions={{ exact: n.to === "/" || n.to === "/pro" }}
                className="flex min-w-0 flex-col items-center justify-center gap-1 px-0.5 py-2.5 text-[11px] font-semibold text-ink-foreground/65 transition-colors hover:text-ink-foreground"
                activeProps={{ className: "flex min-w-0 flex-col items-center justify-center gap-1 px-0.5 py-2.5 text-[11px] font-semibold text-primary" }}>
                <n.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="max-w-full truncate">{n.label}</span>
              </Link>
            </Fragment>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" aria-label="Plus d'options" aria-current={moreActive ? "page" : undefined}
                className={`flex h-auto min-w-0 flex-col items-center justify-center gap-1 rounded-none px-0.5 py-2.5 text-[11px] font-semibold hover:bg-sidebar-accent hover:text-ink-foreground ${moreActive ? "text-primary" : "text-ink-foreground/65"}`}>
                <Menu className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>Plus</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" sideOffset={10} className="mb-1 min-w-44">
              {moreNav.map((item) => (
                <DropdownMenuItem key={item.to} asChild>
                  <Link to={item.to} className="flex w-full items-center gap-3 px-3 py-3 font-semibold">
                    <item.icon className="h-5 w-5" aria-hidden="true" />{item.label}
                  </Link>
                </DropdownMenuItem>
              ))}
              {roles.includes("admin") && (
                <DropdownMenuItem asChild>
                  <Link to="/admin" className="flex w-full items-center gap-3 px-3 py-3 font-bold text-primary">
                    <Shield className="h-5 w-5" aria-hidden="true" />Espace Admin
                  </Link>
                </DropdownMenuItem>
              )}
              {user && (
                <DropdownMenuItem onSelect={() => void signOut()} className="flex w-full items-center gap-3 px-3 py-3 font-semibold text-destructive">
                  <LogOut className="h-5 w-5" aria-hidden="true" />Se déconnecter
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string | undefined; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-extrabold">{title}</h1>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
