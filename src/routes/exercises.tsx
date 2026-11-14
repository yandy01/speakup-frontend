import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronRight, Clock3, LockKeyhole, RotateCcw, Sparkles, Target, Trophy, X } from "lucide-react";
import { AppShell } from "@/components/eloquia/AppShell";
import { DailyChallengeCard } from "@/components/eloquia/DailyChallengeCard";
import { Confetti, Eyebrow } from "@/components/eloquia/ui";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { PRACTICE_BANK, type PracticeExercise } from "@/lib/eloquia/exerciseBank";
import { useStats } from "@/lib/eloquia/stats";
import { pageHead } from "@/lib/eloquia/head";

export const Route = createFileRoute("/exercises")({
  head: pageHead("Exercices", "Le chemin de l’éloquence : 20 étapes à débloquer pour une parole plus sûre."),
  component: () => <AppShell title="Exercices"><ExercisesPage /></AppShell>,
});

function ExercisesPage() {
  const { user } = useAuth();
  const stats = useStats(user?.id);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [active, setActive] = useState<PracticeExercise | null>(null);
  useEffect(() => { setScores(Object.fromEntries(stats.best)); }, [stats.loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const done = PRACTICE_BANK.filter((p) => (scores[p.id] ?? 0) >= 80).length;
  const xp = Object.values(scores).reduce((s, v) => s + Math.round(v * 0.5), 0);

  return (
    <div className="space-y-6">
      <section className="bg-gradient-hero relative overflow-hidden rounded-3xl p-5 text-primary-foreground shadow-lift sm:p-7">
        <Eyebrow className="text-accent">Ton parcours d’orateur</Eyebrow>
        <h2 className="mt-1 text-2xl font-bold sm:text-3xl">Chaque étape te rapproche d’une parole plus sûre.</h2>
        <div className="mt-5 grid grid-cols-3 gap-2 sm:max-w-lg">
          {[["Maîtrisées", `${done}/${PRACTICE_BANK.length}`], ["XP", xp], ["Validation", "80 %"]].map(([l, v]) => <div key={String(l)} className="rounded-2xl bg-primary-foreground/12 p-3 text-center"><b className="block text-xl">{v}</b><small className="text-[11px] text-primary-foreground/75">{l}</small></div>)}
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-primary-foreground/20"><i className="block h-full rounded-full bg-gradient-accent transition-all duration-1000" style={{ width: `${(done / PRACTICE_BANK.length) * 100}%` }} /></div>
      </section>

      <DailyChallengeCard done={stats.todayDone} />

      <div><Eyebrow>Le chemin de l’éloquence</Eyebrow><h3 className="text-lg font-bold text-primary-deep">Débloque les étapes une à une</h3></div>
      <ol className="relative space-y-3 before:absolute before:bottom-6 before:left-6 before:top-6 before:w-1 before:rounded-full before:bg-border sm:before:left-7">
        {PRACTICE_BANK.map((item, i) => {
          const score = scores[item.id]; const passed = (score ?? 0) >= 80;
          const unlocked = i === 0 || (scores[PRACTICE_BANK[i - 1]!.id] ?? 0) >= 80;
          const current = unlocked && !passed;
          return (
            <li key={item.id} className="relative animate-rise" style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}>
              <button disabled={!unlocked} onClick={() => setActive(item)}
                className={`group flex w-full items-center gap-3 rounded-3xl border-2 p-3 text-left transition sm:gap-4 sm:p-4 ${current ? "border-primary bg-card shadow-lift" : passed ? "border-success/30 bg-card shadow-soft hover:border-success" : "border-transparent bg-muted/60 opacity-70"} ${unlocked ? "pressable" : ""}`}>
                <span className={`relative z-10 grid h-12 w-12 shrink-0 place-items-center rounded-full text-base font-bold ring-4 ring-background sm:h-14 sm:w-14 ${passed ? "bg-success text-primary-foreground" : current ? "bg-gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {current && <span className="absolute inset-0 rounded-full bg-primary/40 animate-pulse-ring" />}
                  <span className="relative">{passed ? <Check className="h-6 w-6" /> : !unlocked ? <LockKeyhole className="h-5 w-5" /> : i + 1}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 text-[11px] font-semibold"><span className="rounded-full bg-primary-soft px-2 py-0.5 text-primary-deep">{item.category}</span><span className="flex items-center gap-1 text-muted-foreground"><Clock3 className="h-3 w-3" />{item.duration}</span></span>
                  <b className="mt-1 block leading-snug text-primary-deep">{item.title}</b>
                  <small className="line-clamp-2 text-muted-foreground">{item.objective}</small>
                  {current && <span className="mt-1.5 inline-block rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">{score !== undefined ? `À refaire · ${score}%` : "Ton prochain objectif"}</span>}
                  {passed && <span className="mt-1.5 inline-block text-[11px] font-semibold text-success">Maîtrisé · {score}%</span>}
                </span>
                {unlocked && <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full transition group-hover:translate-x-0.5 ${current ? "bg-accent text-accent-foreground shadow-glow" : "bg-primary-soft text-primary"}`}>{passed ? <RotateCcw className="h-5 w-5" /> : <ChevronRight className="h-6 w-6" />}</span>}
              </button>
            </li>
          );
        })}
      </ol>

      {active && <Player exercise={active} best={scores[active.id] ?? 0} onClose={() => setActive(null)}
        onDone={(score) => setScores((s) => ({ ...s, [active.id]: Math.max(s[active.id] ?? 0, score) }))}
        onNext={(n) => setActive(n)} userId={user?.id} />}
    </div>
  );
}

function Player({ exercise, best, onClose, onDone, onNext, userId }: { exercise: PracticeExercise; best: number; onClose: () => void; onDone: (s: number) => void; onNext: (e: PracticeExercise) => void; userId?: string | undefined }) {
  const [q, setQ] = useState(0); const [answers, setAnswers] = useState<number[]>([]);
  const [revealed, setRevealed] = useState(false); const [result, setResult] = useState<{ score: number; xp: number } | null>(null);
  const timer = useRef<number | null>(null);
  useEffect(() => { setQ(0); setAnswers([]); setRevealed(false); setResult(null); }, [exercise.id]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const question = exercise.questions[q] ?? exercise.questions[0]!;
  const idx = exercise.questions.length;
  const nextEx = PRACTICE_BANK[PRACTICE_BANK.findIndex((p) => p.id === exercise.id) + 1];

  async function next() {
    if (q < idx - 1) { setQ(q + 1); setRevealed(false); return; }
    const correct = exercise.questions.reduce((s, qq, i) => s + (answers[i] === qq.answer ? 1 : 0), 0);
    const score = Math.round((correct / idx) * 100);
    const xp = Math.max(0, Math.round(Math.max(best, score) * 0.5) - Math.round(best * 0.5));
    setResult({ score, xp }); onDone(score);
    if (userId) await supabase.from("exercise_attempts").insert({ user_id: userId, exercise_id: exercise.id, score, xp_earned: xp });
  }
  const passed = (result?.score ?? 0) >= 80;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal>
      <div className="animate-rise pb-safe flex max-h-[100dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[2rem] bg-background shadow-lift sm:max-h-[90vh] sm:rounded-[2rem]">
        <header className="flex items-center gap-3 border-b border-border px-5 py-4">
          <button onClick={onClose} className="tap grid h-10 w-10 place-items-center rounded-full bg-muted" aria-label="Fermer"><X className="h-5 w-5" /></button>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted"><i className="block h-full rounded-full bg-gradient-primary transition-all duration-500" style={{ width: `${result ? 100 : ((q + (revealed ? 1 : 0)) / idx) * 100}%` }} /></div>
          <span className="text-sm font-semibold text-muted-foreground">{result ? "Bilan" : `${q + 1}/${idx}`}</span>
        </header>
        <div className="flex-1 overflow-y-auto p-5 sm:p-7">
          {!result ? (
            <div key={q} className="animate-rise">
              <Eyebrow>{exercise.category} · {exercise.title}</Eyebrow>
              <h2 className="mt-2 text-xl font-bold leading-snug text-primary-deep sm:text-2xl">{question.prompt}</h2>
              <div className="mt-5 space-y-3">
                {question.choices.map((c, i) => {
                  const sel = answers[q] === i, good = i === question.answer;
                  const tone = !revealed ? "border-border bg-card hover:border-primary hover:bg-primary-soft" : good ? "border-success bg-success/10" : sel ? "border-destructive bg-destructive/10" : "border-border bg-card opacity-60";
                  return <button key={i} disabled={revealed} onClick={() => { setAnswers((a) => { const n = [...a]; n[q] = i; return n; }); setRevealed(true); }}
                    className={`tap flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left text-[15px] font-medium transition ${tone}`}>
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${revealed && good ? "bg-success text-primary-foreground" : "bg-primary-soft text-primary-deep"}`}>{revealed && good ? <Check className="h-4 w-4" /> : String.fromCharCode(65 + i)}</span>{c}
                  </button>;
                })}
              </div>
              {revealed && <div className={`animate-pop mt-4 rounded-2xl p-4 text-sm ${answers[q] === question.answer ? "bg-success/10" : "bg-accent-soft"}`}><b className="block">{answers[q] === question.answer ? "Bonne réponse ! 🎉" : "On apprend aussi de ses erreurs."}</b>{question.explanation}</div>}
            </div>
          ) : (
            <div className="relative py-6 text-center">
              {passed && <Confetti />}
              <div className={`animate-pop mx-auto grid h-24 w-24 place-items-center rounded-full ${passed ? "bg-gradient-accent shadow-glow" : "bg-primary-soft"}`}>{passed ? <Trophy className="h-12 w-12 text-accent-foreground" /> : <Target className="h-12 w-12 text-primary" />}</div>
              <div className="mt-4 text-5xl font-bold text-primary-deep">{result.score}%</div>
              <h3 className="mt-2 text-xl font-bold">{passed ? "Étape maîtrisée !" : "Encore un petit effort."}</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{passed ? "Bravo, l’étape suivante est débloquée." : "Il faut 80 % pour valider. Relis les explications et recommence."}</p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent-soft px-4 py-2 font-semibold text-accent-foreground"><Sparkles className="h-4 w-4" /> +{result.xp} XP</div>
            </div>
          )}
        </div>
        <footer className="border-t border-border p-4">
          {!result ? <button disabled={!revealed} onClick={() => void next()} className="tap flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-4 font-semibold text-primary-foreground shadow-lift disabled:opacity-40">{q === idx - 1 ? "Voir mon résultat" : "Continuer"} <ChevronRight className="h-5 w-5" /></button>
            : <div className="grid gap-2 sm:grid-cols-2">
              {passed && nextEx ? <button onClick={() => onNext(nextEx)} className="tap flex items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-4 font-semibold text-primary-foreground shadow-lift">Étape suivante <ChevronRight className="h-5 w-5" /></button>
                : <button onClick={() => { setQ(0); setAnswers([]); setRevealed(false); setResult(null); }} className="tap flex items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-4 font-semibold text-primary-foreground shadow-lift"><RotateCcw className="h-5 w-5" /> Recommencer</button>}
              <button onClick={onClose} className="tap rounded-2xl border-2 border-border py-4 font-semibold">Retour au parcours</button>
            </div>}
        </footer>
      </div>
    </div>
  );
}
