import { createFileRoute } from "@tanstack/react-router";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Award, BookOpen, Clock3, Flame, Mic, Mic2, Target, TrendingUp, Trophy, Zap } from "lucide-react";
import { AppShell } from "@/components/eloquia/AppShell";
import { Eyebrow, Spinner } from "@/components/eloquia/ui";
import { useAuth } from "@/hooks/use-auth";
import { useStats } from "@/lib/eloquia/stats";
import { PRACTICE_BANK } from "@/lib/eloquia/exerciseBank";
import { pageHead } from "@/lib/eloquia/head";

export const Route = createFileRoute("/progress")({
  head: pageHead("Ma progression", "Vos scores, votre série, vos badges et votre historique d’entraînement."),
  component: () => <AppShell title="Ma progression"><ProgressPage /></AppShell>,
});

function ProgressPage() {
  const { user } = useAuth();
  const s = useStats(user?.id);
  if (s.loading) return <Spinner label="Calcul de ta progression…" />;
  const scores = [...s.ex.map((r) => r.score), ...s.ch.map((r) => r.total_score), ...s.rd.filter((r) => r.total_score !== null).map((r) => r.total_score as number)];
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const minutes = Math.round([...s.ch, ...s.rd].reduce((a, r) => a + r.duration_seconds, 0) / 60);
  const chart = [...s.ex.map((r) => ({ d: r.created_at, v: r.score })), ...s.ch.map((r) => ({ d: r.created_at, v: r.total_score })), ...s.rd.filter((r) => r.total_score !== null).map((r) => ({ d: r.created_at, v: r.total_score as number }))]
    .sort((a, b) => +new Date(a.d) - +new Date(b.d)).slice(-30).map((p) => ({ date: new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(new Date(p.d)), score: p.v }));
  const count = s.ex.length + s.ch.length + s.rd.length;
  const badges = [
    { t: "Premier pas", d: "1 activité", I: Mic2, ok: count >= 1 }, { t: "Maîtrise", d: "Un score ≥ 80", I: Award, ok: scores.some((v) => v >= 80) },
    { t: "Orateur", d: "5 défis oraux", I: Mic, ok: s.ch.length >= 5 }, { t: "Excellence", d: "500 XP", I: Zap, ok: s.xp >= 500 },
    { t: "Régularité", d: "3 jours de suite", I: Flame, ok: s.streak >= 3 }, { t: "Lecteur", d: "5 lectures", I: BookOpen, ok: s.rd.length >= 5 },
  ];
  const history = [...s.ex.map((r) => ({ id: r.id, t: PRACTICE_BANK.find((p) => p.id === r.exercise_id)?.title ?? r.exercise_id, k: "Exercice", d: r.created_at, v: r.score as number | null })), ...s.ch.map((r) => ({ id: r.id, t: r.topic, k: "Défi oral", d: r.created_at, v: r.total_score as number | null })), ...s.rd.map((r) => ({ id: r.id, t: r.title, k: "Lecture", d: r.created_at, v: r.total_score }))]
    .sort((a, b) => +new Date(b.d) - +new Date(a.d)).slice(0, 12);

  return (
    <div className="space-y-5">
      <section className="bg-gradient-hero flex items-center gap-4 rounded-3xl p-5 text-primary-foreground shadow-lift">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-accent text-accent-foreground shadow-glow"><Trophy className="h-7 w-7" /></span>
        <div className="flex-1"><small className="text-primary-foreground/75">Points d’expérience</small><b className="block text-3xl">{s.xp.toLocaleString("fr-FR")} XP</b></div>
        <div className="text-center"><Flame className="mx-auto h-6 w-6 fill-accent text-accent" /><b className="text-xl">{s.streak}</b><small className="block text-[10px] text-primary-foreground/75">jours</small></div>
      </section>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[["Activités", count, Target], ["Étapes maîtrisées", s.mastered, Award], ["Temps de parole", `${minutes} min`, Clock3], ["Score moyen", avg === null ? "—" : `${avg}/100`, TrendingUp]].map(([l, v, I]) => { const Icon = I as typeof Target; return <div key={l as string} className="animate-rise rounded-3xl border border-border bg-card p-4 shadow-soft"><Icon className="h-5 w-5 text-primary" /><b className="mt-2 block text-2xl text-primary-deep">{v as string}</b><small className="text-muted-foreground">{l as string}</small></div>; })}
      </div>
      <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
        <Eyebrow>Tes résultats</Eyebrow><h3 className="mb-3 font-bold text-primary-deep">Évolution des scores</h3>
        {chart.length ? <div className="h-60"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chart} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} /><stop offset="100%" stopColor="var(--primary)" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="var(--border)" strokeDasharray="4 5" vertical={false} /><XAxis dataKey="date" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis domain={[0, 100]} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} /><Area type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={3} fill="url(#g)" /></AreaChart></ResponsiveContainer></div>
          : <p className="py-10 text-center text-sm text-muted-foreground">Termine un exercice ou un défi pour voir ta courbe.</p>}
      </section>
      <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
        <div className="mb-3 flex items-end justify-between"><div><Eyebrow>Récompenses</Eyebrow><h3 className="font-bold text-primary-deep">Mes badges</h3></div><small className="font-semibold text-primary">{badges.filter((b) => b.ok).length}/{badges.length}</small></div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">{badges.map((b) => <div key={b.t} className={`rounded-2xl p-3 text-center ${b.ok ? "bg-accent-soft" : "bg-muted opacity-60 grayscale"}`}><span className={`mx-auto grid h-12 w-12 place-items-center rounded-full ${b.ok ? "bg-gradient-accent text-accent-foreground shadow-glow animate-pop" : "bg-border text-muted-foreground"}`}><b.I className="h-6 w-6" /></span><b className="mt-2 block text-xs">{b.t}</b><small className="text-[10px] text-muted-foreground">{b.d}</small></div>)}</div>
      </section>
      <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
        <Eyebrow>Historique</Eyebrow><h3 className="mb-3 font-bold text-primary-deep">Activités récentes</h3>
        {history.length ? <div className="divide-y divide-border">{history.map((h) => <div key={h.id} className="flex items-center gap-3 py-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary"><Target className="h-4 w-4" /></span><div className="min-w-0 flex-1"><b className="block truncate text-sm">{h.t}</b><small className="text-muted-foreground">{h.k} · {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(h.d))}</small></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${h.v !== null && h.v >= 80 ? "bg-success/15 text-success" : "bg-muted"}`}>{h.v === null ? "—" : `${h.v}/100`}</span></div>)}</div>
          : <p className="py-6 text-center text-sm text-muted-foreground">Ton historique apparaîtra ici.</p>}
      </section>
    </div>
  );
}
