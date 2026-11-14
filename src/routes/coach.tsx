import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { History, Keyboard, Mic, Plus, Send, Square, Volume2, VolumeX, X } from "lucide-react";
import { AppShell } from "@/components/eloquia/AppShell";
import { CoachMessage } from "@/components/eloquia/CoachMessage";
import { Bars, Eyebrow, Notice } from "@/components/eloquia/ui";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { coachReply, synthesizeSpeech, transcribeVoice } from "@/lib/eloquia/ai.functions";
import { blobToBase64, micErrorMessage, unlockAudio, VoiceRecorder } from "@/lib/eloquia/audio";
import { playBase64, speakWithDevice, stopSpeaking, type VoicePreset } from "@/lib/eloquia/speak";
import { pageHead } from "@/lib/eloquia/head";

export const Route = createFileRoute("/coach")({
  head: pageHead("Coach IA", "Discutez à voix haute avec votre coach d’éloquence IA."),
  component: () => <AppShell title="Coach IA"><CoachPage /></AppShell>,
});

type Msg = { id: string; role: "user" | "assistant"; content: string };
type Conv = { id: string; title: string; created_at: string };
type Phase = "idle" | "listening" | "transcribing" | "thinking" | "speaking";

const starters = ["Aide-moi à améliorer ma diction avec un exercice.", "Fais-moi pratiquer une présentation d’une minute.", "Apprends-moi à mieux argumenter."];

function CoachPage() {
  const { user } = useAuth();
  const transcribe = useServerFn(transcribeVoice);
  const reply = useServerFn(coachReply);
  const tts = useServerFn(synthesizeSpeech);
  const [convs, setConvs] = useState<Conv[]>([]);
  const [conv, setConv] = useState<Conv | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [level, setLevel] = useState(0);
  const [error, setError] = useState("");
  const [voiceOn, setVoiceOn] = useState(true);
  const [voice, setVoice] = useState<VoicePreset>("Achernar");
  const [draft, setDraft] = useState("");
  const [showText, setShowText] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const recRef = useRef<VoiceRecorder | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setVoice(localStorage.getItem("eloquia-voice") === "Charon" ? "Charon" : "Achernar"); }, []);
  useEffect(() => { supabase.from("conversations").select("id,title,created_at").order("created_at", { ascending: false }).limit(30).then(({ data }) => setConvs((data ?? []) as Conv[])); }, [user?.id]);
  useEffect(() => {
    if (!conv) { setMsgs([]); return; }
    supabase.from("messages").select("id,role,content").eq("conversation_id", conv.id).order("created_at").then(({ data }) => setMsgs((data ?? []) as Msg[]));
  }, [conv]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, phase]);
  useEffect(() => () => { recRef.current?.cancel(); stopSpeaking(); }, []);

  async function speak(text: string) {
    setPhase("speaking");
    const done = () => setPhase((p) => (p === "speaking" ? "idle" : p));
    try {
      const r = await tts({ data: { text, voice } });
      await playBase64(r.audio, r.mime, done);
    } catch {
      if (!speakWithDevice(text, voice, done)) done();
    }
  }

  async function ensureConv(firstText: string) {
    if (conv) return conv;
    const { data, error } = await supabase.from("conversations").insert({ user_id: user!.id, title: firstText.slice(0, 60) }).select("id,title,created_at").single();
    if (error || !data) throw new Error("Impossible de créer la conversation.");
    setConv(data as Conv); setConvs((c) => [data as Conv, ...c]);
    return data as Conv;
  }

  async function send(text: string) {
    if (!user || !text.trim()) return;
    setError(""); setPhase("thinking");
    try {
      const c = await ensureConv(text);
      const { data: u } = await supabase.from("messages").insert({ conversation_id: c.id, user_id: user.id, role: "user", content: text }).select("id,role,content").single();
      setMsgs((m) => [...m, (u as Msg) ?? { id: crypto.randomUUID(), role: "user", content: text }]);
      const { reply: answer } = await reply({ data: { conversationId: c.id } });
      const { data: a } = await supabase.from("messages").insert({ conversation_id: c.id, user_id: user.id, role: "assistant", content: answer }).select("id,role,content").single();
      setMsgs((m) => [...m, (a as Msg) ?? { id: crypto.randomUUID(), role: "assistant", content: answer }]);
      if (voiceOn) await speak(answer); else setPhase("idle");
    } catch (e) { setError(e instanceof Error ? e.message : "Le coach n’a pas pu répondre."); setPhase("idle"); }
  }

  async function onMic() {
    setError("");
    unlockAudio();
    if (phase === "speaking") { stopSpeaking(); setPhase("idle"); return; }
    if (phase === "listening") {
      const rec = recRef.current; recRef.current = null;
      if (!rec) return;
      setPhase("transcribing");
      try {
        const r = await rec.stop();
        if (r.seconds < 0.8 || r.blob.size < 1500) throw new Error("Enregistrement trop court. Maintenez la parole un peu plus longtemps.");
        const { text } = await transcribe({ data: { audio: await blobToBase64(r.blob), mime: r.mime } });
        await send(text);
      } catch (e) { setError(e instanceof Error ? e.message : "Je n’ai pas compris."); setPhase("idle"); }
      return;
    }
    if (phase !== "idle") return;
    try {
      const rec = new VoiceRecorder(); rec.onLevel = setLevel;
      await rec.open(); rec.start(); recRef.current = rec; setPhase("listening");
    } catch (e) { setError(e instanceof Error && e.name === "Error" ? e.message : micErrorMessage(e)); }
  }

  function chooseVoice(v: VoicePreset) { setVoice(v); localStorage.setItem("eloquia-voice", v); }
  function newConv() { stopSpeaking(); setConv(null); setMsgs([]); setPhase("idle"); setShowHistory(false); }
  async function submitText(e: FormEvent) { e.preventDefault(); const t = draft.trim(); if (!t) return; setDraft(""); unlockAudio(); await send(t); }

  const status = { idle: ["Je vous écoute quand vous voulez", "Appuyez sur le micro, parlez, puis appuyez à nouveau."], listening: ["Je vous écoute…", "Appuyez sur le bouton pour envoyer."], transcribing: ["Je comprends votre message…", "Transcription en cours."], thinking: ["Je prépare ma réponse…", "Votre coach réfléchit."], speaking: ["Je vous réponds", "Touchez le bouton pour m’interrompre."] }[phase];
  const busy = phase === "transcribing" || phase === "thinking";

  const History_ = (
    <div className="space-y-2">
      <button onClick={newConv} className="tap flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-3 text-sm font-semibold text-primary-foreground shadow-soft"><Plus className="h-4 w-4" /> Nouvelle conversation</button>
      {convs.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Vos échanges apparaîtront ici.</p>}
      {convs.map((c) => <button key={c.id} onClick={() => { setConv(c); setShowHistory(false); }} className={`tap w-full truncate rounded-xl border px-3 py-2.5 text-left text-sm transition ${conv?.id === c.id ? "border-primary bg-primary-soft font-semibold text-primary-deep" : "border-border bg-card hover:border-primary/40"}`}>{c.title}</button>)}
    </div>
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
      <aside className="hidden lg:block"><Eyebrow>Historique</Eyebrow><h3 className="mb-3 font-bold text-primary-deep">Mes échanges</h3>{History_}</aside>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setShowHistory(true)} className="tap flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-sm font-medium shadow-soft lg:hidden"><History className="h-4 w-4 text-primary" /> Historique</button>
          <div className="flex rounded-full border border-border bg-card p-1 shadow-soft">
            {(["Achernar", "Charon"] as const).map((v) => <button key={v} onClick={() => chooseVoice(v)} className={`tap rounded-full px-3 py-1.5 text-xs font-semibold transition ${voice === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{v === "Achernar" ? "Voix douce" : "Voix posée"}</button>)}
          </div>
          <button onClick={() => { unlockAudio(); void speak("Bonjour ! Je suis votre coach Eloquia. Ensemble, nous allons améliorer votre diction et votre aisance à l’oral."); }} disabled={phase !== "idle"} className="tap flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-2 text-sm font-semibold text-accent-foreground shadow-soft disabled:opacity-50"><Volume2 className="h-4 w-4" /> Tester la voix</button>
          <button onClick={() => { setVoiceOn((v) => !v); stopSpeaking(); }} className="tap ml-auto grid h-10 w-10 place-items-center rounded-full border border-border bg-card shadow-soft" aria-label="Réponses vocales">{voiceOn ? <Volume2 className="h-5 w-5 text-primary" /> : <VolumeX className="h-5 w-5 text-muted-foreground" />}</button>
        </div>

        <div className={`bg-gradient-hero relative overflow-hidden rounded-[2rem] px-5 pb-8 pt-10 text-center text-primary-foreground shadow-lift`}>
          <div className="absolute inset-x-0 top-0 h-full opacity-30"><div className="absolute left-1/2 top-16 h-64 w-64 -translate-x-1/2 rounded-full border border-primary-foreground/30 animate-spin-slow" /></div>
          <div className="relative mx-auto grid h-44 w-44 place-items-center">
            {(phase === "listening" || phase === "speaking") && <><span className="absolute inset-0 rounded-full bg-accent/30 animate-pulse-ring" /><span className="absolute inset-4 rounded-full bg-accent/30 animate-pulse-ring [animation-delay:.6s]" /></>}
            {busy && <span className="absolute inset-2 animate-spin rounded-full border-4 border-primary-foreground/20 border-t-accent" />}
            <button onClick={() => void onMic()} disabled={busy} aria-label={phase === "listening" ? "Envoyer" : "Parler"}
              className={`tap relative grid h-32 w-32 place-items-center rounded-full shadow-glow transition-all duration-300 ${phase === "listening" ? "scale-110 bg-accent text-accent-foreground" : "bg-primary-foreground text-primary-deep hover:scale-105"} disabled:opacity-80`}>
              {phase === "listening" ? <Bars count={5} level={level} className="h-14 text-accent-foreground" /> : phase === "speaking" ? <Square className="h-10 w-10 fill-current" /> : <Mic className="h-12 w-12" />}
            </button>
          </div>
          <div className="relative mt-6"><b className="block text-lg">{status[0]}</b><span className="text-sm text-primary-foreground/75">{status[1]}</span></div>
          {phase === "speaking" && <div className="relative mt-4 text-accent"><Bars count={11} className="h-8" /></div>}
        </div>

        {error && <Notice kind="error">{error}</Notice>}

        {msgs.length === 0 ? (
          <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
            <Eyebrow>Pour commencer</Eyebrow>
            <p className="mt-1 text-sm text-muted-foreground">Parlez de vos objectifs ou choisissez une idée :</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">{starters.map((s) => <button key={s} onClick={() => { unlockAudio(); void send(s); }} disabled={phase !== "idle"} className="tap rounded-2xl border-2 border-primary/30 bg-primary-soft px-4 py-3 text-left text-sm font-medium text-primary-deep transition hover:border-primary">{s}</button>)}</div>
          </div>
        ) : (
          <div className="space-y-3" aria-live="polite">
            {msgs.slice(-12).map((m) => (
              <div key={m.id} className={`animate-rise flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] rounded-3xl px-4 py-3 text-[15px] leading-relaxed shadow-soft ${m.role === "user" ? "rounded-br-md bg-gradient-primary text-primary-foreground" : "rounded-bl-md border border-border bg-card"}`}>
                  {m.role === "assistant" ? <><CoachMessage content={m.content} /><button onClick={() => { unlockAudio(); void speak(m.content); }} disabled={phase !== "idle"} className="tap mt-2 inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary disabled:opacity-50"><Volume2 className="h-3.5 w-3.5" /> Écouter</button></> : m.content}
                </div>
              </div>
            ))}
            {phase === "thinking" && <div className="flex gap-1.5 px-2">{[0, 1, 2].map((i) => <i key={i} className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: `${i * 120}ms` }} />)}</div>}
            <div ref={endRef} />
          </div>
        )}

        {showText ? (
          <form onSubmit={submitText} className="flex gap-2 rounded-3xl border-2 border-primary/30 bg-card p-2 shadow-soft">
            <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Écrivez au coach…" className="flex-1 bg-transparent px-3 text-[15px] outline-none" />
            <button disabled={!draft.trim() || phase !== "idle"} className="tap grid h-11 w-11 place-items-center rounded-full bg-gradient-primary text-primary-foreground disabled:opacity-50"><Send className="h-5 w-5" /></button>
          </form>
        ) : <button onClick={() => setShowText(true)} className="tap mx-auto flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-primary shadow-soft"><Keyboard className="h-4 w-4" /> Écrire plutôt que parler</button>}
      </section>

      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-end bg-foreground/40 backdrop-blur-sm lg:hidden" onClick={() => setShowHistory(false)}>
          <div className="animate-rise pb-safe max-h-[75vh] w-full overflow-y-auto rounded-t-[2rem] bg-background p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border" />
            <div className="mb-3 flex items-center justify-between"><h3 className="font-bold text-primary-deep">Mes échanges</h3><button onClick={() => setShowHistory(false)} className="tap"><X className="h-5 w-5" /></button></div>
            {History_}
          </div>
        </div>
      )}
    </div>
  );
}
