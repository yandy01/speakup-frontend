import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { BarChart3, Bot, Dumbbell, Home, LogOut, Mic, ScrollText, UserRound, Zap } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Brand } from "./Brand";
import { Spinner } from "./ui";
import { AuthScreen } from "./AuthScreen";

const nav = [
  { to: "/", label: "Accueil", icon: Home },
  { to: "/exercises", label: "Exercices", icon: Dumbbell },
  { to: "/coach", label: "Coach IA", icon: Bot },
  { to: "/reading", label: "Prompteur", icon: ScrollText },
  { to: "/challenge", label: "Défi du jour", icon: Zap },
  { to: "/progress", label: "Progression", icon: BarChart3 },
  { to: "/profile", label: "Profil", icon: UserRound },
] as const;
const mobileNav = [nav[0], nav[1], null, nav[3], nav[6]] as const;

export const onboardingKey = (id: string) => `eloquia-onboarding:${id}`;

export function AppShell({ title, children, requireOnboarding = true }: { title: string; children: ReactNode; requireOnboarding?: boolean }) {
  const { user, loading, signOut } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (user && requireOnboarding && !localStorage.getItem(onboardingKey(user.id))) navigate({ to: "/onboarding" });
  }, [user, requireOnboarding, navigate]);

  if (loading) return <div className="grid min-h-screen place-items-center"><Spinner label="Préparation de votre espace…" /></div>;
  if (!user) return <AuthScreen />;
  const name = String(user.user_metadata?.["display_name"] || user.user_metadata?.["full_name"] || user.email?.split("@")[0] || "Orateur");
  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  return (
    <div className="min-h-screen lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar p-5 text-sidebar-foreground lg:flex">
        <Brand light />
        <nav className="mt-10 flex flex-col gap-1.5">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className={`group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all ${isActive(to) ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow" : "hover:bg-sidebar-accent hover:translate-x-1"}`}>
              <Icon className="h-5 w-5" />{label}
              {to === "/challenge" && !isActive(to) && <span className="ml-auto h-2 w-2 animate-pulse rounded-full bg-sidebar-primary" />}
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl bg-sidebar-accent p-4">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-sidebar-primary font-bold text-sidebar-primary-foreground">{name.slice(0, 2).toUpperCase()}</span><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{name}</div><div className="truncate text-xs opacity-70">{user.email}</div></div></div>
          <button onClick={() => void signOut()} className="tap mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-sidebar-border py-2 text-xs font-medium hover:bg-sidebar"><LogOut className="h-4 w-4" /> Se déconnecter</button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="pt-safe sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 lg:px-8">
            <div className="lg:hidden"><Brand compact /></div>
            <h1 className="text-base font-semibold text-primary-deep lg:text-xl">{title}</h1>
            <Link to="/profile" className="tap grid h-10 w-10 place-items-center rounded-full bg-gradient-primary text-sm font-bold text-primary-foreground shadow-soft lg:hidden">{name.slice(0, 2).toUpperCase()}</Link>
            <div className="hidden lg:block" />
          </div>
        </header>
        <main key={pathname} className="animate-rise mx-auto w-full max-w-6xl flex-1 px-4 pb-32 pt-5 lg:px-8 lg:pb-12 lg:pt-8">{children}</main>
      </div>

      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-card/92 backdrop-blur-xl lg:hidden" aria-label="Navigation">
        <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2 pt-1.5">
          {mobileNav.map((item, i) => item === null ? (
            <Link key="mic" to="/coach" aria-label="Parler au coach" className="relative -mt-7 flex flex-col items-center">
              <span className="absolute top-0 h-16 w-16 rounded-full bg-primary/40 animate-pulse-ring" />
              <span className={`tap relative grid h-16 w-16 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-lift ring-4 ring-background ${isActive("/coach") ? "scale-105" : ""}`}><Mic className="h-7 w-7" /></span>
              <span className={`mt-1 text-[10px] font-semibold ${isActive("/coach") ? "text-primary" : "text-muted-foreground"}`}>Coach</span>
            </Link>
          ) : (
            <Link key={i} to={item.to} className={`tap flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold ${isActive(item.to) ? "text-primary" : "text-muted-foreground"}`}>
              <span className={`grid h-8 w-12 place-items-center rounded-full transition-all ${isActive(item.to) ? "bg-primary-soft" : ""}`}><item.icon className="h-5 w-5" /></span>{item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
