import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bot, Dumbbell, Flame, Mic2, ScrollText, Sparkles, Target, Trophy } from "lucide-react";
import { AppShell } from "@/components/eloquia/AppShell";
import { DailyChallengeCard } from "@/components/eloquia/DailyChallengeCard";
import { Bars, Eyebrow } from "@/components/eloquia/ui";
import { useAuth } from "@/hooks/use-auth";
import { useStats } from "@/lib/eloquia/stats";
import { PRACTICE_BANK } from "@/lib/eloquia/exerciseBank";
import { pageHead } from "@/lib/eloquia/head";

export const Route = createFileRoute("/")({
  head: pageHead("Accueil", "Votre espace d’entraînement à l’éloquence : coach vocal IA, exercices, téléprompteur et défi du jour."),
  component: () => <AppShell title="Accueil"><Dashboard /></AppShell>,
});

const tools = [
  { to: "/exercises", label: "Exercices", sub: "Mon parcours", icon: Dumbbell, tone: "bg-primary-soft text-primary-deep" },
  { to: "/coach", label: "Coach IA", sub: "Dialogue vocal", icon: Bot, tone: "bg-gradient-primary text-primary-foreground" },
  { to: "/reading", label: "Téléprompteur", sub: "Lire à voix haute", icon: ScrollText, tone: "bg-accent-soft text-accent-foreground" },
  { to: "/progress", label: "Progression", sub: "Mes résultats", icon: Target, tone: "bg-secondary text-secondary-foreground" },
] as const;

function Dashboard() {
  const { user } = useAuth();
  const s = useStats(user?.id);
  const first = String(user?.user_metadata?.["display_name"] || user?.user_metadata?.["full_name"] || user?.email?.split("@")[0] || "Orateur").split(/[\s._-]/)[0];
  const level = Math.floor(s.xp / 500) + 1, lvlXp = s.xp % 500;
  const pct = Math.round((s.mastered / PRACTICE_BANK.length) * 100);

  return (
    <div className="space-y-5 lg:space-y-7">
      <section className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm capitalize text-muted-foreground">{new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</p>
          <h2 className="text-2xl font-bold text-primary-deep lg:text-4xl">Bonjour {first} 👋</h2>
        </div>
        <div className="animate-pop flex items-center gap-1.5 rounded-2xl bg-accent-soft px-3 py-2 text-accent-foreground shadow-soft"><Flame className="h-5 w-5 fill-accent text-accent" /><b className="text-lg">{s.streak}</b><span className="text-xs">jour{s.streak > 1 ? "s" : ""}</span></div>
      </section>

      <section className="bg-gradient-hero relative overflow-hidden rounded-3xl p-5 text-primary-foreground shadow-lift lg:p-7">
        <div className="absolute right-4 top-1/2 hidden -translate-y-1/2 text-primary-foreground/25 sm:block"><Bars count={13} className="h-20" /></div>
        <div className="relative flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-accent text-accent-foreground shadow-glow"><Trophy className="h-7 w-7" /></span>
          <div className="flex-1">
            <div className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/70">Niveau {level}</div>
            <div className="text-3xl font-bold">{s.xp.toLocaleString("fr-FR")} XP</div>
            <div className="mt-2 h-2.5 max-w-sm overflow-hidden rounded-full bg-primary-foreground/20"><i className="block h-full rounded-full bg-gradient-accent transition-all duration-1000" style={{ width: `${(lvlXp / 500) * 100}%` }} /></div>
            <div className="mt-1.5 text-xs text-primary-foreground/75">{500 - lvlXp} XP avant le niveau {level + 1}</div>
          </div>
        </div>
      </section>

      <DailyChallengeCard done={s.todayDone} />

      <Link to="/coach" className="pressable flex items-center gap-4 rounded-3xl border-2 border-primary/25 bg-card p-4 shadow-soft">
        <span className="relative grid h-14 w-14 place-items-center rounded-full bg-gradient-primary text-primary-foreground"><span className="absolute inset-0 rounded-full bg-primary/40 animate-pulse-ring" /><Mic2 className="relative h-6 w-6" /></span>
        <span className="flex-1"><b className="block text-primary-deep">Parler avec mon coach</b><small className="text-muted-foreground">Appuyez et commencez à parler</small></span>
        <ArrowRight className="h-5 w-5 text-primary" />
      </Link>

      <section>
        <div className="mb-3 flex items-end justify-between"><div><Eyebrow>Pour progresser</Eyebrow><h3 className="text-lg font-bold text-primary-deep">Mes outils</h3></div></div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {tools.map((t, i) => (
            <Link key={t.to} to={t.to} style={{ animationDelay: `${i * 70}ms` }} className="animate-rise pressable flex flex-col gap-3 rounded-3xl border border-border bg-card p-4 shadow-soft">
              <span className={`grid h-12 w-12 place-items-center rounded-2xl ${t.tone}`}><t.icon className="h-6 w-6" /></span>
              <span><b className="block text-primary-deep">{t.label}</b><small className="text-muted-foreground">{t.sub}</small></span>
              <span className="mt-auto flex items-center gap-1 text-xs font-semibold text-primary">Ouvrir <ArrowRight className="h-3.5 w-3.5" /></span>
            </Link>
          ))}
        </div>
      </section>

      <Link to="/exercises" className="pressable block rounded-3xl border border-border bg-card p-5 shadow-soft">
        <div className="flex items-center justify-between"><div><Eyebrow>Chemin de l’éloquence</Eyebrow><b className="block text-primary-deep">{s.mastered} / {PRACTICE_BANK.length} étapes maîtrisées</b></div><b className="text-2xl text-primary">{pct}%</b></div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted"><i className="block h-full rounded-full bg-gradient-primary transition-all duration-1000" style={{ width: `${pct}%` }} /></div>
      </Link>
      <p className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground"><Sparkles className="h-4 w-4 text-accent" /> La régularité compte plus que la perfection.</p>
    </div>
  );
}
