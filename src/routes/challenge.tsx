import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Check, Dices, Mic, RotateCcw, Sparkles, Square, Target, Timer, Trophy, Zap } from "lucide-react";
import { AppShell } from "@/components/eloquia/AppShell";
import { Bars, Confetti, Eyebrow, Notice, ScoreRing } from "@/components/eloquia/ui";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { analyzeSpeech } from "@/lib/eloquia/ai.functions";
import { blobToBase64, micErrorMessage, VoiceRecorder } from "@/lib/eloquia/audio";
import { TOPICS } from "@/lib/eloquia/topics";
import { pageHead } from "@/lib/eloquia/head";

export const Route = createFileRoute("/challenge")({
  head: pageHead("Défi du jour", "Une minute pour convaincre : un sujet surprise et une note de votre jury IA."),
  component: () => <AppShell title="Défi du jour"><ChallengePage /></AppShell>,
});

type Phase = "intro" | "spinning" | "revealed" | "preparing" | "recording" | "analyzing" | "result";
type Feedback = Awaited<ReturnType<typeof analyzeSpeech>>;
const PREP = 10, TALK = 60;
const pick = (prev?: string): string => { const o = TOPICS.filter((t) => t !== prev); return o[Math.floor(Math.random() * o.length)] ?? TOPICS[0]!; };

function Ring({ value, max, children, tone = "var(--accent)" }: { value: number; max: number; children: React.ReactNode; tone?: string }) {
  const r = 88, c = 2 * Math.PI * r;
  return <div className="relative mx-auto grid h-52 w-52 place-items-center">
    <svg width="208" height="208" className="absolute -rotate-90"><circle cx="104" cy="104" r={r} stroke="color-mix(in oklab, var(--primary-foreground) 20%, transparent)" strokeWidth="12" fill="none" /><circle cx="104" cy="104" r={r} stroke={tone} strokeWidth="12" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (value / max)} style={{ transition: "stroke-dashoffset 1s linear" }} /></svg>
    <div className="relative text-center">{children}</div>
  </div>;
}

function ChallengePage() {
  const { user } = useAuth();
  const analyze = useServerFn(analyzeSpeech);
  const [phase, setPhase] = useState<Phase>("intro");
  const [topic, setTopic] = useState("");
  const [flicker, setFlicker] = useState<string>(TOPICS[0]!);
  const [left, setLeft] = useState(PREP);
  const [level, setLevel] = useState(0);
  const [fb, setFb] = useState<Feedback | null>(null);
  const [error, setError] = useState("");
  const rec = useRef<VoiceRecorder | null>(null);

  useEffect(() => () => rec.current?.cancel(), []);

  function spin() {
    setError(""); setFb(null); setPhase("spinning");
    const final = pick(topic);
    let delay = 50, elapsed = 0;
    const step = () => {
      setFlicker(TOPICS[Math.floor(Math.random() * TOPICS.length)] ?? "");
      elapsed += delay; delay *= 1.11;
      if (elapsed < 2800) setTimeout(step, delay);
      else { setTopic(final); setFlicker(final); setPhase("revealed"); if (navigator.vibrate) navigator.vibrate(40); }
    };
    step();
  }

  async function start() {
    setError("");
    try { const r = new VoiceRecorder(); r.onLevel = setLevel; await r.open(); rec.current = r; setLeft(PREP); setPhase("preparing"); }
    catch (e) { setError(e instanceof Error && e.name === "Error" ? e.message : micErrorMessage(e)); }
  }

  useEffect(() => {
    if (phase !== "preparing" && phase !== "recording") return;
    const t = setInterval(() => setLeft((v) => v - 1), 1000);
    return () => clearInterval(t);
  }, [phase]);
  useEffect(() => {
    if (left > 0) return;
    if (phase === "preparing") { rec.current?.start(); setLeft(TALK); setPhase("recording"); if (navigator.vibrate) navigator.vibrate([30, 40, 30]); }
    else if (phase === "recording") void finish();
  }, [left, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  async function finish() {
    const r = rec.current; rec.current = null; if (!r) return;
    setPhase("analyzing");
    try {
      const out = await r.stop();
      if (out.seconds < 3) throw new Error("Prise de parole trop courte pour être évaluée.");
      const res = await analyze({ data: { audio: await blobToBase64(out.blob), mime: out.mime, topic, durationSeconds: out.seconds } });
      setFb(res); setPhase("result");
      if (user) {
        await supabase.from("speaking_challenge_attempts").insert({ user_id: user.id, topic, duration_seconds: Math.max(1, Math.round(out.seconds)), total_score: res.total_score, relevance_score: res.scores.relevance, structure_score: res.scores.structure, clarity_score: res.scores.clarity, fluency_score: res.scores.fluency, xp_earned: Math.min(60, 10 + Math.round(res.total_score * 0.5)), summary: res.summary.slice(0, 1200) });
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Analyse impossible."); setPhase("revealed"); }
  }
  function cancel() { rec.current?.cancel(); rec.current = null; setPhase("revealed"); }

  const dark = phase !== "result";
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <section className={`relative overflow-hidden rounded-[2rem] p-6 text-center shadow-lift sm:p-10 ${dark ? "bg-gradient-challenge text-primary-foreground" : "border border-border bg-card"}`}>
        {phase === "intro" && <div className="animate-rise py-4">
          <div className="relative mx-auto grid h-28 w-28 place-items-center"><span className="absolute inset-0 rounded-3xl bg-primary-foreground/30 animate-pulse-ring" /><span className="animate-float relative grid h-28 w-28 place-items-center rounded-3xl bg-primary-foreground shadow-lift"><Zap className="h-14 w-14 fill-accent text-accent animate-wiggle" /></span></div>
          <Eyebrow className="mt-6 block text-primary-foreground/90">Le défi minute</Eyebrow>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Une minute pour convaincre</h2>
          <p className="mx-auto mt-3 max-w-md text-primary-foreground/85">Un sujet tiré au sort, 10 secondes pour réfléchir, 60 secondes pour défendre ton idée sans lire.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs font-semibold">{[[Timer, "10 s de préparation"], [Mic, "60 s de parole"], [Trophy, "Note sur 100"]].map(([I, l], i) => { const Icon = I as typeof Timer; return <span key={i} className="flex items-center gap-1.5 rounded-full bg-primary-foreground/18 px-3 py-1.5"><Icon className="h-3.5 w-3.5" />{l as string}</span>; })}</div>
          <button onClick={spin} className="tap shimmer mt-8 inline-flex items-center gap-2 rounded-full bg-primary-foreground px-8 py-4 text-lg font-bold text-primary-deep shadow-lift hover:scale-105 transition"><Dices className="h-6 w-6 text-accent" /> Tirer mon sujet</button>
        </div>}

        {phase === "spinning" && <div className="py-10">
          <Eyebrow className="block text-primary-foreground/90">Tirage au sort…</Eyebrow>
          <div className="relative mx-auto mt-6 flex h-40 max-w-lg items-center justify-center overflow-hidden rounded-3xl bg-primary-foreground/12 px-6 ring-2 ring-primary-foreground/30">
            <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-primary-deep/40 to-transparent" /><div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-primary-deep/40 to-transparent" />
            <p key={flicker} className="animate-pop text-lg font-bold sm:text-xl">{flicker}</p>
          </div>
          <div className="mt-6 flex justify-center gap-2">{[0, 1, 2].map((i) => <i key={i} className="h-3 w-3 animate-bounce rounded-full bg-primary-foreground" style={{ animationDelay: `${i * 120}ms` }} />)}</div>
        </div>}

        {phase === "revealed" && <div className="relative py-4">
          <Confetti />
          <Eyebrow className="block text-primary-foreground/90">Ton sujet du jour</Eyebrow>
          <div className="animate-pop relative mx-auto mt-4 max-w-lg rounded-3xl bg-primary-foreground p-6 text-primary-deep shadow-lift"><span className="absolute -top-5 left-6 text-6xl font-bold text-accent">“</span><h3 className="text-xl font-bold leading-snug sm:text-2xl">{topic}</h3><p className="mt-2 text-sm text-muted-foreground">Donne ton avis, un exemple concret, puis conclus.</p></div>
          {error && <div className="mt-4 text-left"><Notice kind="error">{error}</Notice></div>}
          <div className="mt-7 flex flex-col items-center gap-3">
            <button onClick={() => void start()} className="tap inline-flex items-center gap-2 rounded-full bg-primary-foreground px-8 py-4 text-lg font-bold text-primary-deep shadow-lift transition hover:scale-105"><Mic className="h-6 w-6 text-accent" /> Je suis prêt</button>
            <button onClick={spin} className="tap inline-flex items-center gap-1.5 rounded-full border-2 border-primary-foreground/50 px-4 py-2 text-sm font-semibold"><RotateCcw className="h-4 w-4" /> Autre sujet</button>
          </div>
        </div>}

        {phase === "preparing" && <div className="py-2">
          <Eyebrow className="block text-primary-foreground/90">Prépare tes idées</Eyebrow>
          <p className="mx-auto mb-4 mt-2 max-w-md font-semibold">{topic}</p>
          <Ring value={PREP - left} max={PREP}><div key={left} className="animate-pop text-7xl font-bold">{left}</div><div className="text-sm opacity-80">secondes</div></Ring>
          <p className="mt-4 text-sm opacity-85">Introduction · deux idées · conclusion</p>
          <button onClick={cancel} className="tap mt-4 rounded-full border-2 border-primary-foreground/50 px-5 py-2 text-sm font-semibold">Annuler</button>
        </div>}

        {phase === "recording" && <div className="py-2">
          <Eyebrow className="block text-primary-foreground/90"><span className="mr-1.5 inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-destructive" />À toi de parler</Eyebrow>
          <p className="mx-auto mb-4 mt-2 max-w-md font-semibold">{topic}</p>
          <Ring value={TALK - left} max={TALK}><Bars count={7} level={level} className="h-14" /><div className="text-4xl font-bold">0:{String(left).padStart(2, "0")}</div></Ring>
          <button onClick={() => void finish()} className="tap mt-6 inline-flex items-center gap-2 rounded-full bg-primary-foreground px-7 py-4 font-bold text-primary-deep shadow-lift"><Square className="h-5 w-5 fill-current" /> Terminer et envoyer</button>
        </div>}

        {phase === "analyzing" && <div className="py-10">
          <div className="relative mx-auto grid h-28 w-28 place-items-center"><span className="absolute inset-0 animate-spin rounded-full border-4 border-primary-foreground/25 border-t-primary-foreground" /><Sparkles className="h-10 w-10 animate-pulse" /></div>
          <h3 className="mt-6 text-xl font-bold">Ton jury écoute…</h3><p className="mt-1 text-sm opacity-85">Pertinence, structure, clarté et fluidité.</p>
        </div>}

        {phase === "result" && fb && <div className="relative animate-rise">
          {fb.total_score >= 70 && <Confetti />}
          <Eyebrow>Ton évaluation</Eyebrow>
          <div className="mt-3 flex justify-center"><ScoreRing value={fb.total_score} label="/ 100" /></div>
          <h3 className="mt-3 text-xl font-bold text-primary-deep">{fb.total_score >= 80 ? "Très belle prise de parole !" : fb.total_score >= 60 ? "Bonne base, continue !" : "Chaque essai te fait progresser."}</h3>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">{fb.summary}</p>
          <div className="mt-5 grid grid-cols-2 gap-2 text-left sm:grid-cols-4">{[["Pertinence", fb.scores.relevance], ["Structure", fb.scores.structure], ["Clarté", fb.scores.clarity], ["Fluidité", fb.scores.fluency]].map(([l, v]) => <div key={l as string} className="rounded-2xl bg-muted p-3"><small className="text-muted-foreground">{l}</small><b className="block text-lg text-primary-deep">{v}</b><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border"><i className="block h-full bg-gradient-primary" style={{ width: `${v}%` }} /></div></div>)}</div>
          <div className="mt-4 grid gap-3 text-left sm:grid-cols-2">
            <div className="rounded-2xl bg-success/10 p-4"><b className="flex items-center gap-1.5 text-sm"><Check className="h-4 w-4 text-success" /> Points forts</b><ul className="mt-2 space-y-1 text-sm">{fb.strengths.map((s, i) => <li key={i}>• {s}</li>)}</ul></div>
            <div className="rounded-2xl bg-accent-soft p-4"><b className="flex items-center gap-1.5 text-sm"><Target className="h-4 w-4 text-accent-foreground" /> À travailler</b><ul className="mt-2 space-y-1 text-sm">{fb.improvements.map((s, i) => <li key={i}>• {s}</li>)}</ul></div>
          </div>
          {fb.next_exercise && <div className="mt-3 rounded-2xl bg-primary-soft p-4 text-left text-sm"><b>Prochain entraînement :</b> {fb.next_exercise}</div>}
          <div className="mt-6 grid gap-2 sm:grid-cols-2"><button onClick={spin} className="tap flex items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-4 font-semibold text-primary-foreground shadow-lift"><Dices className="h-5 w-5" /> Nouveau sujet</button><button onClick={() => setPhase("revealed")} className="tap rounded-2xl border-2 border-border py-4 font-semibold">Refaire ce sujet</button></div>
        </div>}
      </section>
      <p className="text-center text-xs text-muted-foreground">Ton audio sert uniquement à l’analyse et n’est pas conservé. Seuls le sujet, la note et le bilan sont enregistrés.</p>
    </div>
  );
}
