import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, BookOpen, Check, ChevronDown, CircleStop, Clock3, Mic, Pause, Play, RotateCcw, Settings2, Sparkles, Type, Volume2, WandSparkles, MessageCircle, Languages } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createConversation, saveMessage } from '../lib/data';
import { analyzeReading, estimateReadingMatch, estimateWordsPerMinute, type ReadingFeedback } from '../lib/reading';
import { Notice } from '../components/Notice';

interface ReadingText {
  id: string;
  title: string;
  language: 'fr' | 'en';
  level: 'Débutant' | 'Intermédiaire' | 'Beginner' | 'Intermediate';
  duration: string;
  text: string;
}

const READING_TEXTS: ReadingText[] = [
  {
    id: 'fr-1', language: 'fr', level: 'Débutant', title: 'Une journée qui commence bien', duration: '1 min',
    text: `Chaque matin est une nouvelle occasion d'apprendre et de progresser. Avant de commencer ma journée, je prends quelques minutes pour organiser mes idées. Je définis une priorité, je prépare les tâches importantes et je garde du temps pour les imprévus. Cette petite habitude m'aide à rester concentré et à avancer avec plus de sérénité. Je sais que tout ne sera pas toujours parfait. L'essentiel est de faire de son mieux, de rester curieux et de continuer à apprendre. Les progrès les plus solides viennent souvent de petits efforts répétés chaque jour.`,
  },
  {
    id: 'fr-2', language: 'fr', level: 'Intermédiaire', title: "L’art de communiquer clairement", duration: '1–2 min',
    text: `Bien communiquer ne consiste pas à parler beaucoup. Il s'agit surtout de transmettre une idée de manière claire, structurée et adaptée à son interlocuteur. Avant de prendre la parole, il est utile de savoir quel message on souhaite faire passer. Une introduction simple permet de donner le contexte. Quelques arguments bien choisis permettent ensuite de développer sa pensée. Enfin, une conclusion courte aide l'auditeur à retenir l'essentiel. Le rythme compte également : une pause au bon moment peut rendre une phrase plus compréhensible qu'une succession de mots prononcés trop rapidement. Avec de la pratique, chacun peut apprendre à choisir ses mots et à mieux faire entendre ses idées.`,
  },
  {
    id: 'en-1', language: 'en', level: 'Beginner', title: 'Small steps make progress', duration: '1 min',
    text: `Learning a new language takes time, patience, and regular practice. You do not need to speak perfectly on your first day. Start with simple sentences and useful words. Listen carefully, repeat what you hear, and try to use new expressions in real conversations. When you make a mistake, take a moment to understand it and try again. Every short practice session is an opportunity to improve. Small steps, repeated every day, can lead to great progress.`,
  },
  {
    id: 'en-2', language: 'en', level: 'Intermediate', title: 'The value of clear communication', duration: '1–2 min',
    text: `Clear communication is an essential skill in both personal and professional life. It helps people share ideas, solve problems, and build trust. A good speaker does more than choose the right words: they also organize their thoughts, adapt their message to the audience, and pay attention to their pace. Speaking too quickly can make even a simple idea difficult to follow. Pausing between important points gives listeners time to understand. The goal is not to sound perfect or to hide your accent. The goal is to make your message understandable, natural, and meaningful.`,
  },
];

function feedbackMessage(report: ReadingFeedback, title: string, language: 'fr' | 'en'): string {
  const labels = language === 'fr'
    ? { intro: 'Bilan de ma lecture guidée', target: 'Texte lu', transcript: 'Transcription reconnue', strengths: 'Ce qui est bien', improvements: 'À améliorer', avoid: 'À éviter ou surveiller', next: 'Prochain exercice', summary: 'Bilan du tuteur' }
    : { intro: 'My guided reading review', target: 'Text read', transcript: 'Recognised transcript', strengths: 'What went well', improvements: 'What to improve', avoid: 'What to avoid or watch', next: 'Next exercise', summary: 'Tutor summary' };
  const list = (items: string[]) => items.length ? items.map(item => `- ${item}`).join('\n') : '- —';
  return `${labels.intro}: ${title}\n\n${labels.summary}: ${report.summary}\n\n${labels.strengths}:\n${list(report.strengths)}\n\n${labels.improvements}:\n${list(report.improvements)}\n\n${labels.avoid}:\n${list(report.avoid)}\n\n${labels.next}: ${report.next_exercise}\n\n${labels.transcript}:\n${report.transcript.slice(0, 1300)}\n\n${report.confidence_note}`.slice(0, 3900);
}

export function ReadingPage() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');
  const [selectedId, setSelectedId] = useState('fr-1');
  const [fontSize, setFontSize] = useState(27);
  const [speed, setSpeed] = useState(34);
  const [autoScroll, setAutoScroll] = useState(false);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<ReadingFeedback | null>(null);
  const [conversationId, setConversationId] = useState('');
  const [error, setError] = useState('');
  const [saveWarning, setSaveWarning] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const discardRef = useRef(false);
  const elapsedRef = useRef(0);

  const texts = useMemo(() => READING_TEXTS.filter(item => item.language === language), [language]);
  const selected = (texts.find(item => item.id === selectedId) ?? texts[0])!;

  useEffect(() => {
    if (selected && selected.id !== selectedId) setSelectedId(selected.id);
  }, [selected, selectedId]);

  useEffect(() => {
    if (!autoScroll || !scrollRef.current) return;
    let frame = 0;
    let lastTime = 0;
    const tick = (time: number) => {
      const node = scrollRef.current;
      if (!node) return;
      if (lastTime) {
        const delta = Math.min(time - lastTime, 50);
        node.scrollTop += (speed * delta) / 1000;
        if (node.scrollTop + node.clientHeight >= node.scrollHeight - 4) {
          setAutoScroll(false);
          return;
        }
      }
      lastTime = time;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [autoScroll, speed, selectedId]);

  useEffect(() => {
    if (!recording || paused) return;
    const timer = window.setInterval(() => {
      setElapsed(previous => {
        elapsedRef.current = previous + 1;
        return previous + 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [recording, paused]);

  useEffect(() => () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
    streamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  function resetReading() {
    setFeedback(null);
    setConversationId('');
    setError('');
    setSaveWarning('');
    setElapsed(0);
    elapsedRef.current = 0;
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }

  async function persistTutorConversation(report: ReadingFeedback, title: string): Promise<string> {
    if (!user) throw new Error('Connectez-vous pour conserver le bilan dans votre espace tuteur.');
    const conversation = await createConversation(user.id, `Lecture — ${title}`.slice(0, 48), language);
    const userContext = `${language === 'fr' ? 'J’ai terminé une lecture guidée. Voici le texte et le retour audio réel de mon tuteur. Aide-moi à comprendre mes difficultés et à progresser.' : 'I completed a guided reading. Here is the target text and my actual audio feedback. Help me understand my difficulties and improve.'}\n\nTEXTE CIBLE:\n${selected.text.slice(0, 900)}\n\nTRANSCRIPTION RECONNUE:\n${report.transcript.slice(0, 1100)}\n\nBILAN:\n${report.summary}`.slice(0, 3900);
    await saveMessage({ conversationId: conversation.id, userId: user.id, role: 'user', content: userContext });
    await saveMessage({ conversationId: conversation.id, userId: user.id, role: 'assistant', content: feedbackMessage(report, title, language) });
    setConversationId(conversation.id);
    return conversation.id;
  }

  async function processAudio(blob: Blob, durationSeconds: number) {
    if (!session) { setError('Votre session a expiré. Reconnectez-vous avant de lancer une analyse.'); return; }
    if (!blob.size) { setError('Aucun son n’a été enregistré. Vérifiez l’autorisation du microphone.'); return; }
    setAnalyzing(true);
    setError('');
    setFeedback(null);
    setConversationId('');
    setSaveWarning('');
    try {
      const report = await analyzeReading({ session, audio: blob, durationSeconds, targetText: selected.text, title: selected.title, language });
      setFeedback(report);
      try {
        await persistTutorConversation(report, selected.title);
      } catch (saveError) {
        setSaveWarning(saveError instanceof Error ? saveError.message : 'Le bilan est prêt, mais sa conversation n’a pas pu être sauvegardée.');
      }
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : 'Impossible d’analyser cette lecture.');
    } finally {
      setAnalyzing(false);
    }
  }

  async function startRecording() {
    resetReading();
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Cet appareil ou ce navigateur ne prend pas en charge l’enregistrement audio nécessaire. Essayez avec Chrome ou Safari à jour, en HTTPS.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      const candidates = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'];
      const mimeType = candidates.find(candidate => MediaRecorder.isTypeSupported(candidate));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 64000 } : { audioBitsPerSecond: 64000 });
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      discardRef.current = false;
      elapsedRef.current = 0;
      setElapsed(0);
      recorder.ondataavailable = event => { if (event.data.size > 0) chunksRef.current.push(event.data); };
      recorder.onerror = () => setError('Une erreur est survenue pendant l’enregistrement.');
      recorder.onstop = () => {
        const actualMime = recorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: actualMime.split(';')[0] });
        const duration = Math.max(1, elapsedRef.current);
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        setRecording(false);
        setPaused(false);
        setAutoScroll(false);
        if (!discardRef.current) void processAudio(blob, duration);
      };
      recorder.start(500);
      setRecording(true);
      setPaused(false);
      setAutoScroll(true);
    } catch (recordError) {
      setError(recordError instanceof Error && recordError.name === 'NotAllowedError'
        ? 'Le microphone est bloqué. Autorisez SpeakUp AI à utiliser le microphone dans les réglages du navigateur.'
        : 'Impossible d’accéder au microphone. Vérifiez qu’aucune autre application ne l’utilise.');
    }
  }

  function togglePause() {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (recorder.state === 'recording') {
      recorder.pause();
      setPaused(true);
      setAutoScroll(false);
    } else if (recorder.state === 'paused') {
      recorder.resume();
      setPaused(false);
      setAutoScroll(true);
    }
  }

  function stopRecording(discard = false) {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    discardRef.current = discard;
    recorder.stop();
  }

  const wpm = feedback ? estimateWordsPerMinute(feedback.transcript, elapsed) : null;
  const match = feedback ? estimateReadingMatch(selected.text, feedback.transcript) : null;

  return <div className="page-stack reading-page">
    <section className="page-intro-row"><div><span className="eyebrow">LECTURE GUIDÉE & EXPRESSION ORALE</span><h2>Votre téléprompteur</h2><p>Lisez à votre rythme, enregistrez votre voix et recevez un véritable retour de votre tuteur IA.</p></div><div className="intro-medallion"><BookOpen size={25} /></div></section>

    {!recording && !analyzing && !feedback && <div className="reading-selection panel">
      <div className="reading-selection-top"><div><span className="eyebrow">1 · CHOISIR UN TEXTE</span><h3>Que souhaitez-vous lire ?</h3></div><div className="reading-language"><Languages size={16}/><select value={language} onChange={event => { setLanguage(event.target.value as 'fr' | 'en'); resetReading(); }} aria-label="Langue du texte"><option value="fr">Français</option><option value="en">English</option></select></div></div>
      <div className="reading-text-choices">{texts.map(item => <button key={item.id} className={`reading-choice ${selected?.id === item.id ? 'active' : ''}`} onClick={() => { setSelectedId(item.id); resetReading(); }}><span className="reading-choice-level">{item.level} · {item.duration}</span><strong>{item.title}</strong><span>{item.text.slice(0, 112)}…</span><i>{selected?.id === item.id ? <Check size={15}/> : <ChevronDown size={15}/>}</i></button>)}</div>
      <div className="reading-start-row"><div><strong>{selected?.title}</strong><span>{selected?.text.trim().split(/\s+/).length} mots · {language === 'fr' ? 'Texte original en français' : 'Original English text'}</span></div><button className="button button-primary" onClick={() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; document.getElementById('reading-stage')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}><BookOpen size={16}/> Ouvrir le téléprompteur</button></div>
    </div>}

    {!feedback && !analyzing && <section id="reading-stage" className="teleprompter-panel panel">
      <div className="teleprompter-toolbar"><div><span className="eyebrow">2 · VOTRE TEXTE</span><h3>{selected?.title}</h3></div><div className="teleprompter-tools"><button className="tool-button" onClick={() => setFontSize(value => Math.max(20, value - 2))} title="Réduire le texte"><Type size={15}/><span>A−</span></button><button className="tool-button" onClick={() => setFontSize(value => Math.min(40, value + 2))} title="Agrandir le texte"><Type size={15}/><span>A+</span></button></div></div>
      <div className="teleprompter-settings"><label><span><Settings2 size={14}/> Vitesse de défilement</span><strong>{speed} px/s</strong><input type="range" min="12" max="75" step="1" value={speed} onChange={event => setSpeed(Number(event.target.value))} /></label><span className="teleprompter-hint">Placez le téléphone à hauteur des yeux et lisez sans vous presser.</span></div>
      <div className={`teleprompter-window ${recording ? 'is-recording' : ''}`} ref={scrollRef}>
        <div className="teleprompter-fade top"/><p className="teleprompter-text" style={{ fontSize }}>{selected?.text}</p><div className="teleprompter-fade bottom"/>
      </div>
      <div className="teleprompter-footer"><div className="teleprompter-timer"><span className={`record-dot ${recording ? 'active' : ''}`}/><strong>{String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}</strong><span>{recording ? (paused ? 'En pause' : 'Enregistrement') : 'Prêt à lire'}</span></div>
        {!recording ? <button className="button button-primary" onClick={() => void startRecording()} disabled={analyzing}><Mic size={17}/> Commencer la lecture</button> : <div className="recording-controls"><button className="button button-secondary" onClick={togglePause}>{paused ? <Play size={16}/> : <Pause size={16}/>} {paused ? 'Reprendre' : 'Pause'}</button><button className="button button-primary" onClick={() => stopRecording(false)}><CircleStop size={17}/> Terminer et analyser</button><button className="tool-button danger" onClick={() => stopRecording(true)} title="Annuler l’enregistrement"><RotateCcw size={16}/></button></div>}
      </div>
      {recording && <div className="recording-note"><Volume2 size={14}/> Gardez une voix naturelle. Le défilement se met en pause lorsque vous mettez l’enregistrement en pause.</div>}
    </section>}

    {error && <Notice kind="error">{error}</Notice>}
    {analyzing && <section className="reading-analysis-loading panel"><div className="analysis-orb"><WandSparkles size={28}/></div><span className="eyebrow">VOTRE TUTEUR ÉCOUTE</span><h3>Analyse de votre lecture en cours…</h3><p>Le tuteur transcrit votre lecture, la compare au texte et prépare un retour personnalisé.</p><div className="analysis-progress"><i/></div><small>L’enregistrement est transmis pour analyse et n’est pas conservé par cette fonction.</small></section>}

    {feedback && <section className="reading-feedback panel">
      <div className="feedback-heading"><div><span className="eyebrow">3 · RETOUR PERSONNALISÉ</span><h3>Votre tuteur a terminé son analyse</h3><p>{feedback.summary}</p></div><div className="feedback-medallion"><Sparkles size={25}/></div></div>
      <div className="reading-metrics"><div><span><Clock3 size={14}/> Durée</span><strong>{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</strong></div><div><span><Volume2 size={14}/> Débit estimé</span><strong>{wpm ? `${wpm}` : '—'} <small>mots/min</small></strong></div><div><span><Check size={14}/> Correspondance estimée</span><strong>{match === null ? '—' : `${match}%`}</strong></div></div>
      <div className="feedback-columns">
        <article className="feedback-card strengths"><h4><Check size={16}/> Ce qui est bien</h4>{feedback.strengths.length ? <ul>{feedback.strengths.map((item, index) => <li key={index}>{item}</li>)}</ul> : <p>Aucun point fort précis n’a pu être isolé.</p>}</article>
        <article className="feedback-card improvements"><h4><WandSparkles size={16}/> Ce que vous pouvez améliorer</h4>{feedback.improvements.length ? <ul>{feedback.improvements.map((item, index) => <li key={index}>{item}</li>)}</ul> : <p>Aucune amélioration prioritaire n’a été identifiée.</p>}</article>
        <article className="feedback-card avoid"><h4><AlertCircle size={16}/> Ce qu’il faut éviter</h4>{feedback.avoid.length ? <ul>{feedback.avoid.map((item, index) => <li key={index}>{item}</li>)}</ul> : <p>Aucune habitude particulière à éviter n’a été clairement détectée.</p>}</article>
      </div>
      {feedback.next_exercise && <div className="next-reading-exercise"><span className="eyebrow">VOTRE PROCHAIN EXERCICE</span><p>{feedback.next_exercise}</p></div>}
      <details className="transcript-details"><summary>Voir la transcription reconnue</summary><p>{feedback.transcript}</p><small>{feedback.confidence_note}</small></details>
      {saveWarning && <Notice kind="info">Votre bilan est disponible, mais la conversation avec le tuteur n’a pas pu être enregistrée : {saveWarning}</Notice>}
      <div className="feedback-actions"><button className="button button-primary" onClick={() => { if (conversationId) navigate(`/coach?conversation=${encodeURIComponent(conversationId)}`); else void persistTutorConversation(feedback, selected.title).then(id => navigate(`/coach?conversation=${encodeURIComponent(id)}`)).catch(e => setSaveWarning(e instanceof Error ? e.message : 'Enregistrement impossible.')); }}><MessageCircle size={16}/> Continuer avec mon tuteur</button><button className="button button-secondary" onClick={resetReading}><RotateCcw size={16}/> Refaire la lecture</button></div>
    </section>}
    <p className="reading-privacy"><AlertCircle size={13}/> Votre audio est envoyé au moteur IA pour être analysé. Cette fonction ne le sauvegarde pas dans Supabase. Le bilan et la conversation pédagogique sont conservés dans votre historique.</p>
  </div>;
}

