import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Clock3, Mic2, Target, TrendingUp } from "lucide-react";
import { AppShell, onboardingKey } from "@/components/eloquia/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { pageHead } from "@/lib/eloquia/head";

export const Route = createFileRoute("/onboarding")({
  head: pageHead("Bienvenue", "Personnalisez votre parcours d’éloquence en quatre étapes."),
  component: () => <AppShell title="Bienvenue" requireOnboarding={false}><Onboarding /></AppShell>,
});

const GOALS = ["Prendre la parole avec confiance", "Améliorer ma diction", "Structurer mes idées", "Argumenter et convaincre", "Réussir mes présentations", "M’exprimer au quotidien"];
const DIFF = ["Le trac", "Les hésitations", "L’articulation", "Le vocabulaire", "La structure", "Le débit et la respiration"];
const LEVELS = [["beginner", "Débutant", "Je construis de bonnes bases."], ["intermediate", "Intermédiaire", "Je parle déjà, je veux progresser."], ["advanced", "Avancé", "Je veux affiner mon impact."]];

function Onboarding() {
  const { user } = useAuth(); const navigate = useNavigate();
  const [step, setStep] = useState(0); const [goals, setGoals] = useState<string[]>([]); const [level, setLevel] = useState("beginner");
  const [diff, setDiff] = useState<string[]>([]); const [min, setMin] = useState(10);
  const toggle = (v: string, a: string[], f: (x: string[]) => void) => f(a.includes(v) ? a.filter((x) => x !== v) : [...a, v]);
  function finish(skip = false) { if (!user) return; localStorage.setItem(onboardingKey(user.id), JSON.stringify(skip ? { skipped: true } : { goals, level, diff, min })); navigate({ to: "/" }); }
  const opt = (sel: boolean) => `tap flex w-full items-center justify-between gap-3 rounded-2xl border-2 p-4 text-left font-medium transition ${sel ? "border-primary bg-primary-soft text-primary-deep shadow-soft" : "border-border bg-card hover:border-primary/40"}`;
  const Icon = [Target, Mic2, TrendingUp, Clock3][step] ?? Target;
  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 flex items-center justify-between text-xs font-semibold text-muted-foreground"><span>ÉTAPE {step + 1} / 4</span><button onClick={() => finish(true)} className="text-primary">Plus tard</button></div>
      <div className="mb-6 h-2 overflow-hidden rounded-full bg-muted"><i className="block h-full rounded-full bg-gradient-primary transition-all duration-500" style={{ width: `${((step + 1) / 4) * 100}%` }} /></div>
      <div key={step} className="animate-rise">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-lift"><Icon className="h-7 w-7" /></span>
        <h2 className="mt-4 text-2xl font-bold text-primary-deep">{["Quel est votre objectif ?", "Où en êtes-vous ?", "Que voulez-vous améliorer ?", "Votre rythme idéal ?"][step]}</h2>
        <div className="mt-5 space-y-2.5">
          {step === 0 && GOALS.map((g) => <button key={g} className={opt(goals.includes(g))} onClick={() => toggle(g, goals, setGoals)}>{g}{goals.includes(g) && <Check className="h-5 w-5 text-primary" />}</button>)}
          {step === 1 && LEVELS.map(([v, l, d]) => <button key={v} className={opt(level === v)} onClick={() => setLevel(v ?? "beginner")}><span><b className="block">{l}</b><small className="font-normal text-muted-foreground">{d}</small></span>{level === v && <Check className="h-5 w-5 text-primary" />}</button>)}
          {step === 2 && DIFF.map((g) => <button key={g} className={opt(diff.includes(g))} onClick={() => toggle(g, diff, setDiff)}>{g}{diff.includes(g) && <Check className="h-5 w-5 text-primary" />}</button>)}
          {step === 3 && <div className="grid grid-cols-4 gap-2">{[5, 10, 15, 20].map((m) => <button key={m} onClick={() => setMin(m)} className={`tap rounded-2xl border-2 py-5 text-center transition ${min === m ? "border-primary bg-primary text-primary-foreground shadow-lift" : "border-border bg-card"}`}><b className="block text-2xl">{m}</b><small>min/jour</small></button>)}</div>}
        </div>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-3">
        <button disabled={step === 0} onClick={() => setStep(step - 1)} className="tap flex items-center justify-center gap-2 rounded-2xl border-2 border-border py-4 font-semibold disabled:opacity-40"><ArrowLeft className="h-5 w-5" /> Retour</button>
        <button onClick={() => (step < 3 ? setStep(step + 1) : finish())} className="tap flex items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-4 font-semibold text-primary-foreground shadow-lift">{step < 3 ? "Continuer" : "C’est parti"} {step < 3 ? <ArrowRight className="h-5 w-5" /> : <Check className="h-5 w-5" />}</button>
      </div>
    </div>
  );
}
