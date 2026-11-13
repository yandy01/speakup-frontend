import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, Clock3, Mic, MicOff, RotateCcw, Sparkles, Target, Trophy, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { supportedRecorderMime } from '../lib/voice';
import { Notice } from '../components/Notice';

type Feedback = { transcript: string; summary: string; scores: { relevance: number; structure: number; clarity: number; fluency: number }; total_score: number; strengths: string[]; improvements: string[]; avoid: string[]; next_exercise: string; confidence_note: string };
const TOPICS = [
  'Faut-il apprendre à parler en public dès l’école ?', 'Les réseaux sociaux améliorent-ils vraiment la communication ?', 'Pourquoi est-il important de savoir écouter ?', 'Le télétravail rapproche-t-il ou éloigne-t-il les équipes ?', 'Peut-on réussir sans savoir bien communiquer ?', 'La lecture est-elle encore indispensable aujourd’hui ?', 'Faut-il toujours dire la vérité, même lorsqu’elle dérange ?', 'Le téléphone nous aide-t-il à mieux communiquer ?', 'Pourquoi la ponctualité est-elle une marque de respect ?', 'Les erreurs sont-elles nécessaires pour apprendre ?', 'Comment convaincre quelqu’un sans lui imposer son opinion ?', 'L’intelligence artificielle améliore-t-elle notre manière de travailler ?', 'La confiance se construit-elle par les actes ou par les paroles ?', 'Pourquoi la première impression est-elle importante ?', 'Le travail en équipe est-il toujours plus efficace ?', 'Faut-il privilégier l’expérience ou les diplômes ?', 'Comment expliquer une idée complexe simplement ?', 'La curiosité est-elle une qualité essentielle ?', 'Peut-on être un bon leader sans être un bon orateur ?', 'Pourquoi faut-il apprendre à gérer les désaccords ?', 'La réussite dépend-elle davantage de la discipline ou du talent ?', 'Les livres peuvent-ils changer notre façon de penser ?', 'Comment garder son calme face à une critique ?', 'Faut-il savoir improviser dans la vie professionnelle ?', 'Pourquoi les pauses rendent-elles un discours plus puissant ?', 'La politesse est-elle sous-estimée dans les échanges ?', 'Comment présenter un projet en une minute ?', 'Est-il préférable de parler peu mais clairement ?', 'La communication non verbale est-elle aussi importante que les mots ?', 'Que signifie être convaincant sans exagérer ?'
];
function chooseTopic(previous?: string) { const options = TOPICS.filter(topic => topic !== previous); return options[Math.floor(Math.random() * options.length)]; }
function dailyTopic() { const today = new Date(); const key = `${today.getFullYear()}-${today.getMonth()+1}-${today.getDate()}`; let hash = 2166136261; for (let i=0;i<key.length;i++) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619); return TOPICS[(hash >>> 0) % TOPICS.length]; }
function api(path: string) { const base = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '') || ''; const prefix = base ? (base.endsWith('/api') ? base : `${base}/api`) : '/api'; return `${prefix}/${path}`; }
async function toBase64(blob: Blob) { const bytes = new Uint8Array(await blob.arrayBuffer()); let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(bin); }

export function ChallengePage() {
  const { user, session } = useAuth();
  const [topic, setTopic] = useState(() => dailyTopic());
  const [phase, setPhase] = useState<'ready' | 'preparing' | 'recording' | 'analyzing' | 'result'>('ready');
  const [countdown, setCountdown] = useState(10);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const durationRef = useRef(0);
  const discardRef = useRef(false);

  useEffect(() => {
    if (phase !== 'preparing') return;
    const timer = window.setInterval(() => setCountdown(v => Math.max(0, v - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [phase]);
  useEffect(() => { if (phase === 'preparing' && countdown === 0) beginRecording(); }, [phase, countdown]);
  useEffect(() => {
    if (phase !== 'recording') return;
    const timer = window.setInterval(() => setSecondsLeft(v => Math.max(0, v - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [phase]);
  useEffect(() => { if (phase === 'recording' && secondsLeft === 0) stopCapture(); }, [phase, secondsLeft]);
  useEffect(() => () => { const recorder = recorderRef.current; if (recorder && recorder.state !== 'inactive') { discardRef.current = true; recorder.ondataavailable = null; recorder.onstop = null; recorder.onerror = null; try { recorder.stop(); } catch { /* Enregistreur déjà arrêté */ } } streamRef.current?.getTracks().forEach(t => t.stop()); }, []);

  function beginRecording() {
    const stream = streamRef.current;
    if (!stream || phase !== 'preparing') return;
    const mimeType = supportedRecorderMime();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 64_000 } : { audioBitsPerSecond: 64_000 });
    recorderRef.current = recorder; chunksRef.current = []; durationRef.current = 0; discardRef.current = false;
    recorder.ondataavailable = event => { if (event.data.size) chunksRef.current.push(event.data); };
    recorder.onerror = () => { setError('L’enregistrement a été interrompu. Vérifiez l’accès au microphone.'); releaseMic(); setPhase('ready'); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: (recorder.mimeType || mimeType || 'audio/webm').split(';')[0] });
      releaseMic();
      if (!discardRef.current) void analyze(blob, Math.max(1, durationRef.current));
    };
    recorder.start(500); setPhase('recording'); setSecondsLeft(60);
  }
  function releaseMic() { streamRef.current?.getTracks().forEach(track => track.stop()); streamRef.current = null; recorderRef.current = null; }
  async function startChallenge() {
    setError(''); setSaveError(''); setFeedback(null); setCountdown(10); setSecondsLeft(60);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { setError('Ce navigateur ne permet pas l’enregistrement audio. Ouvre Eloquia en HTTPS dans Safari ou Chrome à jour et autorise le microphone.'); return; }
    try { const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); streamRef.current = stream; setPhase('preparing'); }
    catch (e) { const name = e instanceof Error ? e.name : ''; setError(name === 'NotAllowedError' ? 'Accès au microphone refusé. Autorise le microphone dans les réglages du navigateur.' : 'Impossible d’ouvrir le microphone. Vérifie qu’aucune autre application ne l’utilise.'); }
  }
  function stopCapture() { const recorder = recorderRef.current; if (!recorder || recorder.state === 'inactive') return; discardRef.current = false; durationRef.current = 60 - secondsLeft; recorder.stop(); setPhase('analyzing'); }
  async function analyze(blob: Blob, duration: number) {
    if (!session || !blob.size) { setError('Enregistrement vide ou session expirée.'); setPhase('ready'); return; }
    setPhase('analyzing');
    try {
      const response = await fetch(api('analyze-speech'), { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ audio_base64: await toBase64(blob), mime_type: blob.type || 'audio/webm', topic, duration_seconds: duration }) });
      const payload = await response.json().catch(() => null) as { feedback?: Feedback; error?: string } | null;
      if (!response.ok || !payload?.feedback) throw new Error(payload?.error || `L’analyse du défi a échoué (HTTP ${response.status}).`);
      const result = payload.feedback; setFeedback(result);
      const xp = Math.min(60, 10 + Math.round(result.total_score * .5));
      if (user && supabase) {
        const { error: saveErr } = await supabase.from('speaking_challenge_attempts').insert({ user_id: user.id, topic, duration_seconds: duration, total_score: result.total_score, relevance_score: result.scores.relevance, structure_score: result.scores.structure, clarity_score: result.scores.clarity, fluency_score: result.scores.fluency, xp_earned: xp, summary: result.summary });
        if (saveErr) setSaveError('Ton bilan est disponible, mais son enregistrement dans l’historique a échoué. Vérifie que la migration du défi a été exécutée.');
      }
      setPhase('result');
    } catch (e) { setError(e instanceof Error ? e.message : 'Impossible d’analyser ton défi.'); setPhase('ready'); }
  }
  function reset(nextTopic = false) { if (recorderRef.current && recorderRef.current.state !== 'inactive') { discardRef.current = true; recorderRef.current.stop(); } releaseMic(); setFeedback(null); setError(''); setSaveError(''); setPhase('ready'); setCountdown(10); setSecondsLeft(60); if (nextTopic) setTopic(current => chooseTopic(current)); }
  const timerLabel = useMemo(() => `00:${String(phase === 'preparing' ? countdown : secondsLeft).padStart(2, '0')}`, [phase, countdown, secondsLeft]);

  return <div className="page-stack challenge-page">
    <Link to="/exercises" className="back-link"><ArrowLeft size={16}/> Retour au chemin</Link>
    <section className="challenge-hero panel"><div className="challenge-hero-kicker"><Zap size={16}/> LE DÉFI MINUTE</div><h2>Une minute pour défendre ton idée.</h2><p>Chaque jour, un nouveau sujet t’attend. Dix secondes pour organiser tes pensées, puis une minute pour parler sans lire. Ton tuteur évalue ta prestation et t’indique comment progresser.</p><div className="challenge-rules"><span><Clock3 size={15}/> 10 s de préparation</span><span><Mic size={15}/> 60 s de parole</span><span><Trophy size={15}/> Note sur 100</span></div></section>
    <section className="challenge-stage panel">
      <div className="challenge-stage-top"><span className="eyebrow">TON SUJET DU JOUR</span><button className="challenge-refresh" onClick={() => reset(true)} disabled={phase === 'preparing' || phase === 'recording' || phase === 'analyzing'}><RotateCcw size={15}/> Autre sujet</button></div>
      <div className="challenge-topic"><span className="challenge-topic-quote">“</span><h3>{topic}</h3><p>Exprime ton point de vue. Appuie-toi sur un exemple concret et termine par une conclusion.</p></div>
      {phase === 'ready' && <div className="challenge-ready"><div className="challenge-big-icon"><Mic size={28}/></div><h3>Prêt à relever le défi ?</h3><p>Installe-toi dans un endroit calme. Tu auras dix secondes pour préparer tes idées.</p><button className="button button-gold" onClick={() => void startChallenge()}><Mic size={17}/> Commencer le défi</button></div>}
      {phase === 'preparing' && <div className="challenge-running"><span className="eyebrow">PRÉPARE TES IDÉES</span><strong className="challenge-countdown">00:{String(countdown).padStart(2,'0')}</strong><p>Introduction · deux idées · conclusion</p><div className="challenge-progress"><i style={{ width: `${(10-countdown)*10}%` }}/></div><button className="button button-secondary" onClick={() => { setError('Défi annulé.'); reset(false); }}>Annuler</button></div>}
      {phase === 'recording' && <div className="challenge-running is-speaking"><span className="eyebrow">À TOI DE PARLER</span><div className="eloqia-wave" aria-label="Enregistrement en cours"><i/><i/><i/><i/><i/><i/><i/><i/><i/></div><strong className="challenge-countdown">{timerLabel}</strong><p>Parle naturellement. Pense à marquer des pauses.</p><div className="challenge-progress"><i style={{ width: `${(60-secondsLeft)/60*100}%` }}/></div><button className="button button-gold" onClick={stopCapture}><MicOff size={17}/> Terminer et envoyer</button><small>Le microphone sera coupé dès l’arrêt de l’enregistrement.</small></div>}
      {phase === 'analyzing' && <div className="challenge-running"><div className="challenge-thinking-orb"><Sparkles size={26}/></div><span className="eyebrow">TON TUTEUR ÉCOUTE</span><h3>Analyse de ta prise de parole…</h3><p>Le tuteur vérifie la pertinence, la structure, la clarté et la fluidité de ton intervention.</p><div className="challenge-progress"><i className="indeterminate"/></div></div>}
      {error && <Notice kind="error">{error}</Notice>}
      {phase === 'result' && feedback && <div className="challenge-result">
        <div className="challenge-score-medal"><Trophy size={29}/></div><span className="eyebrow">TON ÉVALUATION</span><strong className="challenge-total-score">{feedback.total_score}<small>/100</small></strong><h3>{feedback.total_score >= 80 ? 'Très bonne prise de parole !' : feedback.total_score >= 60 ? 'Bonne base, continuons.' : 'Chaque essai te fait progresser.'}</h3><p>{feedback.summary}</p>
        <div className="challenge-score-grid">{[{label:'Pertinence',value:feedback.scores.relevance},{label:'Structure',value:feedback.scores.structure},{label:'Clarté',value:feedback.scores.clarity},{label:'Fluidité',value:feedback.scores.fluency}].map(item => <div key={item.label}><span>{item.label}</span><strong>{item.value}/100</strong><div className="challenge-mini-track"><i style={{width:`${item.value}%`}}/></div></div>)}</div>
        <div className="challenge-feedback-grid"><article><h4><Check size={15}/> Tes points forts</h4><ul>{feedback.strengths.map((s,i)=><li key={i}>{s}</li>)}</ul></article><article><h4><Target size={15}/> À travailler</h4><ul>{feedback.improvements.map((s,i)=><li key={i}>{s}</li>)}</ul></article>{feedback.avoid.length>0 && <article><h4><RotateCcw size={15}/> À éviter</h4><ul>{feedback.avoid.map((s,i)=><li key={i}>{s}</li>)}</ul></article>}</div>
        {feedback.next_exercise && <div className="challenge-next-task"><span className="eyebrow">TON PROCHAIN ENTRAÎNEMENT</span><p>{feedback.next_exercise}</p></div>}
        {feedback.confidence_note && <small className="challenge-confidence-note">{feedback.confidence_note}</small>}
        {saveError && <Notice kind="info">{saveError}</Notice>}
        <div className="challenge-result-actions"><button className="button button-gold" onClick={() => reset(true)}><RotateCcw size={16}/> Nouveau sujet</button><button className="button button-secondary" onClick={() => reset(false)}>Refaire ce sujet</button></div>
      </div>}
    </section>
    <p className="challenge-privacy">Ton audio est transmis au moteur IA pour l’analyse et n’est pas conservé dans Supabase. Seuls le sujet, la note et le bilan synthétique sont enregistrés dans ton historique.</p>
  </div>;
}
