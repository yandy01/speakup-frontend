import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Gauge, Maximize2, Minimize2, Mic, Pause, Play, RotateCcw, Sparkles, Square, Target, Type } from "lucide-react";
import { AppShell } from "@/components/eloquia/AppShell";
import { Bars, Confetti, Eyebrow, Notice, ScoreRing } from "@/components/eloquia/ui";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { analyzeReading } from "@/lib/eloquia/ai.functions";
import { blobToBase64, micErrorMessage, VoiceRecorder } from "@/lib/eloquia/audio";
import { TEXTS, type ReadingText } from "@/lib/eloquia/readingTexts";
import { pageHead } from "@/lib/eloquia/head";

export const Route = createFileRoute("/reading")({
  head: pageHead("Téléprompteur", "Lisez à voix haute avec un téléprompteur défilant et recevez une analyse de votre lecture."),
  component: () => <AppShell title="Téléprompteur"><ReadingPage /></AppShell>,
});

type Feedback = Awaited<ReturnType<typeof analyzeReading>>;
const levelTone: Record<string, string> = { Initiation: "bg-success/15 text-success", "Élémentaire": "bg-primary-soft text-primary-deep", "Intermédiaire": "bg-accent-soft text-accent-foreground", "Avancé": "bg-secondary text-primary-deep", Expert: "bg-primary-deep text-primary-foreground" };

function ReadingPage() {
  const [text, setText] = useState<ReadingText | null>(null);
  if (text) return <Prompter text={text} onBack={() => setText(null)} />;
  return (
    <div className="space-y-5">
      <section className="bg-gradient-hero rounded-3xl p-5 text-primary-foreground shadow-lift sm:p-7">
        <Eyebrow className="text-accent">Lire et progresser</Eyebrow>
        <h2 className="mt-1 text-2xl font-bold sm:text-3xl">Choisis un texte, lis-le à voix haute.</h2>
        <p className="mt-2 max-w-xl text-sm text-primary-foreground/80">Le texte défile tout seul à ton rythme. Ton tuteur analyse ensuite ta fidélité, ton rythme, ton articulation et ton expressivité.</p>
      </section>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TEXTS.map((t, i) => (
          <button key={t.id} onClick={() => setText(t)} style={{ animationDelay: `${Math.min(i, 9) * 40}ms` }} className="animate-rise pressable group flex flex-col rounded-3xl border border-border bg-card p-4 text-left shadow-soft">
            <div className="flex items-center gap-2 text-[11px] font-semibold"><span className={`rounded-full px-2 py-0.5 ${levelTone[t.level] ?? "bg-muted"}`}>{t.level}</span><span className="text-muted-foreground">{t.duration}</span></div>
            <b className="mt-2 leading-snug text-primary-deep">{t.title}</b>
            <small className="mt-1 text-muted-foreground">{t.focus}</small>
            <span className="mt-3 inline-flex items-center gap-1.5 self-start rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition group-hover:bg-primary-deep"><Play className="h-3.5 w-3.5 fill-current" /> Lire ce texte</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Prompter({ text, onBack }: { text: ReadingText; onBack: () => void }) {
  const { user } = useAuth();
  const analyze = useServerFn(analyzeReading);
  const box = useRef<HTMLDivElement>(null);
  const raf = useRef(0); const last = useRef(0); const pos = useRef(0);
  const rec = useRef<VoiceRecorder | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(40); // px per second
  const [size, setSize] = useState(30);
  const [full, setFull] = useState(false);
  const [count, setCount] = useState(0);
  const [recording, setRecording] = useState(false);
  const [level, setLevel] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [fb, setFb] = useState<Feedback | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!playing) { cancelAnimationFrame(raf.current); return; }
    last.current = performance.now();
    pos.current = box.current?.scrollTop ?? 0;
    const tick = (now: number) => {
      const el = box.current; if (!el) return;
      const dt = (now - last.current) / 1000; last.current = now;
      pos.current += speed * dt;
      el.scrollTop = pos.current;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) { setPlaying(false); return; }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, speed]);
  useEffect(() => () => { rec.current?.cancel(); }, []);
  useEffect(() => {
    if (count <= 0) return;
    const t = setTimeout(() => {
      if (count === 1) {
        setCount(0);
        try {
          if (!rec.current) throw new Error("Le microphone n’est plus disponible. Relancez l’enregistrement.");
          rec.current.start();
          setRecording(true);
          setPlaying(true);
        } catch (error) {
          rec.current?.cancel();
          rec.current = null;
          setError(error instanceof Error ? error.message : "Impossible de démarrer l’enregistrement.");
        }
      } else {
        setCount(count - 1);
      }
    }, 800);
    return () => clearTimeout(t);
  }, [count]);

  function restart() { setPlaying(false); pos.current = 0; if (box.current) box.current.scrollTop = 0; }
  async function startReading() {
    setError(""); setFb(null); restart();
    try { const r = new VoiceRecorder(); r.onLevel = setLevel; await r.open(); rec.current = r; setCount(3); }
    catch (e) { setError(e instanceof Error && e.name === "Error" ? e.message : micErrorMessage(e)); }
  }
  async function stopReading() {
    setPlaying(false); setRecording(false);
    const r = rec.current; rec.current = null; if (!r) return;
    setAnalyzing(true);
    try {
      const out = await r.stop();
      if (out.seconds < 3) throw new Error("Lecture trop courte pour être analysée.");
      const res = await analyze({ data: { audio: await blobToBase64(out.blob), mime: out.mime, targetText: text.text, title: text.title, durationSeconds: out.seconds } });
      setFb(res); setFull(false);
      if (user) await supabase.from("reading_attempts").insert({ user_id: user.id, text_id: text.id, title: text.title, duration_seconds: Math.max(1, Math.round(out.seconds)), total_score: res.total_score, reading_accuracy_score: res.scores.reading_accuracy, pacing_score: res.scores.pacing, articulation_score: res.scores.articulation, expression_score: res.scores.expression, xp_earned: res.total_score === null ? 5 : Math.min(50, 5 + Math.round(res.total_score * 0.45)), summary: res.summary.slice(0, 1200) });
    } catch (e) { setError(e instanceof Error ? e.message : "Analyse impossible."); }
    finally { setAnalyzing(false); }
  }

  const paragraphs = (text.text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [text.text]).reduce<string[]>((a, s, i) => { if (i % 3 === 0) a.push(s.trim()); else a[a.length - 1] += " " + s.trim(); return a; }, []);

  if (fb) return (
    <div className="relative mx-auto max-w-2xl animate-rise space-y-4 rounded-[2rem] border border-border bg-card p-6 text-center shadow-lift">
      {(fb.total_score ?? 0) >= 70 && <Confetti />}
      <Eyebrow>Bilan de lecture</Eyebrow><h2 className="font-bold text-primary-deep">{text.title}</h2>
      <div className="flex justify-center">{fb.total_score !== null ? <ScoreRing value={fb.total_score} label="/ 100" /> : <div className="py-6 text-muted-foreground">Note non évaluable</div>}</div>
      <p className="text-sm text-muted-foreground">{fb.summary}</p>
      <div className="grid grid-cols-2 gap-2 text-left sm:grid-cols-4">{[["Fidélité", fb.scores.reading_accuracy], ["Rythme", fb.scores.pacing], ["Articulation", fb.scores.articulation], ["Expressivité", fb.scores.expression]].map(([l, v]) => <div key={l as string} className="rounded-2xl bg-muted p-3"><small className="text-muted-foreground">{l}</small><b className="block text-lg text-primary-deep">{v ?? "—"}</b></div>)}</div>
      <div className="grid gap-3 text-left sm:grid-cols-2">
        <div className="rounded-2xl bg-success/10 p-4 text-sm"><b className="flex items-center gap-1.5"><Check className="h-4 w-4 text-success" /> Points forts</b><ul className="mt-2 space-y-1">{fb.strengths.map((s, i) => <li key={i}>• {s}</li>)}</ul></div>
        <div className="rounded-2xl bg-accent-soft p-4 text-sm"><b className="flex items-center gap-1.5"><Target className="h-4 w-4" /> À améliorer</b><ul className="mt-2 space-y-1">{fb.improvements.map((s, i) => <li key={i}>• {s}</li>)}</ul></div>
      </div>
      {fb.next_exercise && <div className="rounded-2xl bg-primary-soft p-4 text-left text-sm"><b>Prochain exercice :</b> {fb.next_exercise}</div>}
      <div className="grid gap-2 sm:grid-cols-2"><button onClick={() => { setFb(null); restart(); }} className="tap flex items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-4 font-semibold text-primary-foreground shadow-lift"><RotateCcw className="h-5 w-5" /> Relire ce texte</button><button onClick={onBack} className="tap rounded-2xl border-2 border-border py-4 font-semibold">Choisir un autre texte</button></div>
    </div>
  );

  return (
    <div className={full ? "fixed inset-0 z-[60] flex flex-col bg-primary-deep" : "space-y-4"}>
      {!full && <button onClick={onBack} className="tap inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-primary shadow-soft"><ArrowLeft className="h-4 w-4" /> Tous les textes</button>}
      {error && <Notice kind="error">{error}</Notice>}
      <div className={`relative overflow-hidden bg-primary-deep text-primary-foreground ${full ? "flex-1" : "rounded-[2rem] shadow-lift"}`}>
        <div className="flex items-center justify-between gap-3 border-b border-primary-foreground/10 px-4 py-3">
          <div className="min-w-0"><div className="truncate text-sm font-semibold">{text.title}</div><div className="text-[11px] text-primary-foreground/60">{text.focus} · {text.duration}</div></div>
          {recording ? <span className="flex items-center gap-2 rounded-full bg-destructive/90 px-3 py-1 text-xs font-bold"><span className="h-2 w-2 animate-pulse rounded-full bg-primary-foreground" /> REC <Bars count={4} level={level} className="h-4 w-6" /></span>
            : <button onClick={() => setFull((f) => !f)} className="tap grid h-9 w-9 place-items-center rounded-full bg-primary-foreground/10" aria-label="Plein écran">{full ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</button>}
        </div>
        <div className="relative">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-primary-deep to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-28 bg-gradient-to-t from-primary-deep to-transparent" />
          <div className="pointer-events-none absolute inset-x-3 top-[34%] z-10 h-[1.6em] rounded-xl border-y-2 border-accent/60 bg-accent/10" style={{ fontSize: size }} />
          <div ref={box} onTouchStart={() => setPlaying(false)} onWheel={() => setPlaying(false)} className={`overflow-y-auto px-6 ${full ? "h-[calc(100dvh-170px)]" : "h-[55vh] sm:h-[60vh]"}`} style={{ scrollbarWidth: "none" }}>
            <div className="h-[34%] min-h-32" />
            {paragraphs.map((p, i) => <p key={i} className="mx-auto mb-[1em] max-w-3xl text-center font-semibold" style={{ fontSize: size, lineHeight: 1.55 }}>{p}</p>)}
            <div className="h-[60vh]" />
          </div>
          {count > 0 && <div className="absolute inset-0 z-20 grid place-items-center bg-primary-deep/80"><span key={count} className="animate-pop text-9xl font-bold text-accent">{count}</span></div>}
          {analyzing && <div className="absolute inset-0 z-20 grid place-items-center bg-primary-deep/90 text-center"><div><span className="mx-auto block h-16 w-16 animate-spin rounded-full border-4 border-primary-foreground/20 border-t-accent" /><Sparkles className="mx-auto mt-4 h-6 w-6 animate-pulse text-accent" /><b className="mt-2 block">Ton tuteur analyse ta lecture…</b></div></div>}
        </div>
        <div className="pb-safe space-y-3 border-t border-primary-foreground/10 px-4 pt-3">
          <div className="flex items-center gap-3 text-xs">
            <Gauge className="h-4 w-4 shrink-0 text-accent" /><input type="range" min={15} max={110} value={speed} onChange={(e) => setSpeed(+e.target.value)} className="flex-1 accent-[var(--accent)]" aria-label="Vitesse" />
            <Type className="h-4 w-4 shrink-0 text-accent" /><input type="range" min={20} max={48} value={size} onChange={(e) => setSize(+e.target.value)} className="w-20 accent-[var(--accent)] sm:w-32" aria-label="Taille" />
          </div>
          <div className="flex items-center justify-center gap-3 pb-1">
            <button onClick={restart} disabled={recording} className="tap grid h-12 w-12 place-items-center rounded-full bg-primary-foreground/10 disabled:opacity-40" aria-label="Recommencer"><RotateCcw className="h-5 w-5" /></button>
            <button onClick={() => setPlaying((p) => !p)} className="tap grid h-14 w-14 place-items-center rounded-full bg-primary-foreground text-primary-deep shadow-lift" aria-label={playing ? "Pause" : "Lecture"}>{playing ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current" />}</button>
            {recording ? <button onClick={() => void stopReading()} className="tap flex h-14 items-center gap-2 rounded-full bg-destructive px-5 font-bold shadow-lift"><Square className="h-5 w-5 fill-current" /> Terminer</button>
              : <button onClick={() => void startReading()} disabled={analyzing || count > 0} className="tap shimmer flex h-14 items-center gap-2 rounded-full bg-accent px-5 font-bold text-accent-foreground shadow-glow disabled:opacity-50"><Mic className="h-5 w-5" /> Lire et être noté</button>}
          </div>
        </div>
      </div>
      {!full && <p className="text-center text-xs text-muted-foreground">Astuce : ▶ fait défiler le texte sans enregistrer. « Lire et être noté » lance un décompte, enregistre et fait défiler.</p>}
    </div>
  );
}
