import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { AudioLines, Bot, Check, ChevronDown, Mic, MicOff, Plus, Send, Volume2, VolumeX, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createConversation, listConversations, listMessages, saveMessage } from '../lib/data';
import { askSpeakUpCoach } from '../lib/ai';
import { supportedRecorderMime, transcribeFrenchAudio, synthesizeFrenchSpeech } from '../lib/voice';
import type { Conversation } from '../lib/types';
import { Notice } from '../components/Notice';
import { Loading } from '../components/Loading';
import { CoachMessage } from '../components/CoachMessage';

interface DisplayMessage { id: string; role: 'user' | 'assistant'; content: string; created_at?: string }
type VoicePreset = 'Achernar' | 'Charon';
const getStoredVoice = (): VoicePreset => localStorage.getItem('eloqia-voice') === 'Charon' ? 'Charon' : 'Achernar';
const waveBars = Array.from({ length: 27 }, (_, index) => index);

export function CoachPage() {
  const { user, session } = useAuth();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [voiceReplies, setVoiceReplies] = useState(true);
  const [voice, setVoice] = useState<VoicePreset>(getStoredVoice);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceFallback, setVoiceFallback] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef('');
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;
    if (!user) return;
    listConversations(user.id)
      .then(rows => { if (alive) setConversations(rows); })
      .catch(e => { if (alive) setError(e instanceof Error ? e.message : 'Impossible de charger les conversations.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [user]);

  useEffect(() => {
    const id = searchParams.get('conversation');
    if (!id || !conversations.length) return;
    const match = conversations.find(row => row.id === id);
    if (match && selected?.id !== match.id) setSelected(match);
  }, [searchParams, conversations, selected]);

  useEffect(() => {
    if (!selected || !user) { setMessages([]); return; }
    let alive = true;
    listMessages(selected.id, user.id)
      .then(rows => {
        if (!alive) return;
        setMessages(rows.map((row, index) => ({
          id: String(row.id || `${selected.id}-${index}`),
          role: (row.role === 'assistant' || row.sender === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
          content: String(row.content || row.message || ''),
          created_at: typeof row.created_at === 'string' ? row.created_at : undefined,
        })).filter(row => row.content));
      })
      .catch(e => { if (alive) setError(e instanceof Error ? e.message : 'Impossible de charger les messages.'); });
    return () => { alive = false; };
  }, [selected, user]);

  useEffect(() => { messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, sending]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.onerror = null;
      try { recorder.stop(); } catch { /* Déjà arrêté */ }
    }
    audioRef.current?.pause();
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
  }, []);

  function stopCoachAudio() {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    setSpeaking(false);
  }

  function resetConversation() {
    setSelected(null);
    setMessages([]);
    setDraft('');
    setError('');
    setVoiceFallback(false);
    stopCoachAudio();
  }

  async function playVoice(text: string, preset: VoicePreset, announceError = true) {
    if (!session || !text.trim()) return;
    setSpeaking(true);
    setVoiceFallback(false);
    try {
      const blob = await synthesizeFrenchSpeech(session, text, preset);
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      const url = URL.createObjectURL(blob);
      audioUrlRef.current = url;
      const audio = audioRef.current || new Audio();
      audioRef.current = audio;
      audio.src = url;
      audio.onended = () => setSpeaking(false);
      audio.onerror = () => setSpeaking(false);
      await audio.play();
    } catch (e) {
      setSpeaking(false);
      setVoiceFallback(true);
      if (announceError) setError(e instanceof Error ? `${e.message} La réponse écrite reste disponible.` : 'La voix du professeur est indisponible.');
    }
  }

  async function getConversation() {
    if (!user) throw new Error('Connectez-vous pour démarrer une conversation.');
    if (selected) return selected;
    const row = await createConversation(user.id, 'Conversation avec Eloquia', 'fr');
    setSelected(row);
    setConversations(old => [row, ...old]);
    return row;
  }

  async function submitTutorMessage(content: string) {
    if (!user || !session || sending) return;
    setSending(true);
    setError('');
    try {
      const conversation = await getConversation();
      const savedUser = await saveMessage({ conversationId: conversation.id, userId: user.id, role: 'user', content });
      setMessages(old => [...old, { id: String(savedUser.id || Date.now()), role: 'user', content }]);
      const reply = await askSpeakUpCoach(session, conversation.id, content, 'fr');
      const savedAssistant = await saveMessage({ conversationId: conversation.id, userId: user.id, role: 'assistant', content: reply });
      setMessages(old => [...old, { id: String(savedAssistant.id || `${Date.now()}-assistant`), role: 'assistant', content: reply }]);
      if (voiceReplies) await playVoice(reply, voice);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Le professeur n’a pas pu répondre.');
    } finally { setSending(false); }
  }

  async function sendText(event?: FormEvent) {
    event?.preventDefault();
    const content = draft.trim();
    if (!content) return;
    setDraft('');
    await submitTutorMessage(content);
  }

  async function startVoiceCapture() {
    setError('');
    if (!session) { setError('Votre session a expiré. Reconnectez-vous avant de démarrer une prise de parole.'); return; }
    if (recording) { recorderRef.current?.stop(); return; }
    if (sending || transcribing) return;
    if (speaking) stopCoachAudio();
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Le microphone n’est pas disponible dans ce navigateur. Ouvrez Eloquia en HTTPS et autorisez l’accès au microphone.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      const mimeType = supportedRecorderMime();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 64_000 } : { audioBitsPerSecond: 64_000 });
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = event => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onerror = () => {
        setError('L’enregistrement a été interrompu. Vérifiez les autorisations du microphone.');
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        setRecording(false);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        setRecording(false);
        if (blob.size) void handleVoiceBlob(blob);
        else setError('Aucune voix détectée. Réessayez en parlant plus près du téléphone.');
      };
      recorder.start(300);
      setRecording(true);
    } catch (e) {
      const name = e instanceof Error ? e.name : '';
      setError(name === 'NotAllowedError'
        ? 'Accès au microphone refusé. Autorisez-le dans les réglages du navigateur.'
        : 'Impossible d’ouvrir le microphone. Vérifiez les autorisations et réessayez.');
    }
  }

  async function handleVoiceBlob(blob: Blob) {
    if (!session) return;
    setTranscribing(true);
    setError('');
    try {
      const transcript = await transcribeFrenchAudio(session, blob);
      await submitTutorMessage(transcript);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'La voix n’a pas pu être comprise.');
    } finally { setTranscribing(false); }
  }

  function chooseVoice(value: string) {
    const next = value === 'Charon' ? 'Charon' : 'Achernar';
    setVoice(next);
    localStorage.setItem('eloqia-voice', next);
  }

  const status = recording ? 'Je vous écoute' : transcribing ? 'Je comprends votre intervention' : sending ? 'Je prépare ma réponse' : speaking ? 'Je vous réponds' : 'Je suis prêt à vous écouter';
  const statusDescription = recording
    ? 'Appuyez sur le bouton pour terminer votre prise de parole.'
    : transcribing ? 'Votre intervention est transcrite et analysée.'
    : sending ? 'Votre coach prépare un retour adapté à votre demande.'
    : speaking ? 'Le professeur vous répond à voix haute. Vous pouvez interrompre la lecture.'
    : 'Appuyez sur le microphone, parlez, puis appuyez de nouveau pour envoyer.';
  const welcome = useMemo(() => 'Je suis votre coach d’éloquence. Parlez-moi de vos objectifs, posez une question ou choisissez un entraînement pour commencer.', []);

  return <div className="page-stack coach-page">
    <section className="coach-page-heading">
      <div><span className="eyebrow">VOTRE COACH PERSONNEL</span><h2>Parlons éloquence.</h2><p>Un échange vocal, une prise de parole à la fois.</p></div>
      <div className="coach-voice-picker"><label htmlFor="coach-voice">Voix du coach</label><select id="coach-voice" value={voice} onChange={event => chooseVoice(event.target.value)}><option value="Achernar">Achernar · douce</option><option value="Charon">Charon · informative</option></select><button type="button" onClick={() => void playVoice('Bonjour. Je suis votre coach Eloquia. Ensemble, nous allons améliorer votre diction, votre fluidité et votre éloquence.', voice)} disabled={!session || speaking || sending}><Volume2 size={16} /> Tester</button></div>
    </section>

    <div className="coach-layout eloqia-coach-layout">
      <aside className="conversation-sidebar panel">
        <div className="conversation-sidebar-head"><div><span className="eyebrow">HISTORIQUE</span><h3>Mes échanges</h3></div><button className="small-icon-button" onClick={resetConversation} title="Nouvelle conversation" aria-label="Nouvelle conversation"><Plus size={18} /></button></div>
        <button className="new-chat-button" onClick={resetConversation}><Plus size={16} /> Nouvelle conversation</button>
        <div className="conversation-list">{loading ? <Loading label="Chargement…" /> : conversations.length ? conversations.map(row => <button key={row.id} className={`conversation-item ${selected?.id === row.id ? 'selected' : ''}`} onClick={() => setSelected(row)}><Bot size={16} /><span>{String(row.title || 'Conversation')}</span></button>) : <div className="conversation-empty">Vos échanges apparaîtront ici.</div>}</div>
      </aside>
      <details className="conversation-history-mobile">
        <summary><Bot size={16} /> Mes conversations ({conversations.length}) <span aria-hidden="true">⌄</span></summary>
        <button className="new-chat-button" onClick={resetConversation}><Plus size={16} /> Nouvelle conversation</button>
        <div className="conversation-list">{loading ? <Loading label="Chargement…" /> : conversations.length ? conversations.map(row => <button key={row.id} className={`conversation-item ${selected?.id === row.id ? 'selected' : ''}`} onClick={() => setSelected(row)}><Bot size={16} /><span>{String(row.title || 'Conversation')}</span></button>) : <div className="conversation-empty">Vos échanges apparaîtront ici.</div>}</div>
      </details>

      <section className="coach-main panel eloqia-coach-main">
        <header className="coach-main-heading"><div className="coach-avatar"><Bot size={23} /></div><div><strong>Coach IA Eloquia</strong><span><i className="live-dot" /> Français · Entraînement personnalisé</span></div><button type="button" className={`coach-audio-toggle ${voiceReplies ? 'enabled' : ''}`} onClick={() => { setVoiceReplies(value => !value); if (voiceReplies) stopCoachAudio(); }} aria-label={voiceReplies ? 'Désactiver les réponses vocales' : 'Activer les réponses vocales'} title={voiceReplies ? 'Réponses vocales activées' : 'Réponses vocales désactivées'}>{voiceReplies ? <Volume2 size={19} /> : <VolumeX size={19} />}</button></header>

        {error && <div className="coach-error"><Notice kind="error">{error}</Notice></div>}
        {voiceFallback && <div className="coach-error"><Notice kind="info">La réponse écrite reste disponible. Vous pouvez relancer sa lecture avec le bouton « Écouter ».</Notice></div>}

        <div className={`coach-voice-stage ${recording ? 'is-listening' : ''} ${transcribing || sending ? 'is-thinking' : ''} ${speaking ? 'is-speaking' : ''}`}>
          <div className="coach-wave-field" aria-hidden="true">
            <div className="coach-wave-ring ring-one" /><div className="coach-wave-ring ring-two" />
            <div className="coach-wave-bars">{waveBars.map(index => <i key={index} style={{ animationDelay: `${(index % 9) * -0.13}s` }} />)}</div>
            <div className="coach-wave-orb"><AudioLines size={32} /></div>
          </div>
          <div className="coach-stage-status"><strong>{status}</strong><span>{statusDescription}</span></div>
          <button type="button" className={`coach-main-mic ${recording ? 'recording' : ''}`} onClick={() => void startVoiceCapture()} disabled={sending || transcribing} aria-label={recording ? 'Terminer ma prise de parole' : 'Commencer ma prise de parole'}>
            {recording ? <MicOff size={25} /> : <Mic size={25} />}
            <span>{recording ? 'Terminer ma prise de parole' : sending || transcribing ? 'Traitement en cours…' : 'Appuyer pour parler'}</span>
          </button>
          {speaking && <button type="button" className="coach-interrupt-button" onClick={stopCoachAudio}><X size={15} /> Interrompre la réponse</button>}
        </div>

        {!messages.length && <div className="coach-first-prompts"><span className="eyebrow">POUR COMMENCER</span><p>{welcome}</p><div><button type="button" onClick={() => setDraft('Aidez-moi à améliorer ma diction avec un exercice progressif.')}>Améliorer ma diction</button><button type="button" onClick={() => setDraft('Faites-moi pratiquer une présentation personnelle d’une minute.')}>M’entraîner à me présenter</button><button type="button" onClick={() => setDraft('Apprenez-moi à structurer une opinion avec des arguments.')}>Mieux argumenter</button></div></div>}

        {!!messages.length && <div className="coach-dialogue-log" aria-live="polite">
          {messages.slice(-8).map(message => <article key={message.id} className={`coach-dialogue-message ${message.role}`}><span>{message.role === 'assistant' ? 'ELOQUIA' : 'VOUS'}</span><div>{message.role === 'assistant' ? <CoachMessage content={message.content} /> : <p>{message.content}</p>}{message.role === 'assistant' && <button type="button" className="message-speak" onClick={() => void playVoice(message.content, voice)} disabled={speaking}><Volume2 size={14} /> Écouter</button>}</div></article>)}
          {sending && <div className="coach-thinking-label"><i /><i /><i /> Le coach réfléchit…</div>}
          <div ref={messageEndRef} />
        </div>}

        <details className="coach-text-fallback"><summary><ChevronDown size={16} /> Écrire plutôt que parler</summary><form className="coach-text-form" onSubmit={sendText}><textarea value={draft} onChange={event => setDraft(event.target.value)} placeholder="Écrivez votre message au coach…" rows={2} /><button className="button button-primary" type="submit" disabled={!draft.trim() || sending || transcribing}><Send size={17} /> Envoyer</button></form></details>
        <p className="coach-privacy-note">Votre intervention audio est transcrite pour obtenir une réponse. L’enregistrement brut n’est pas conservé dans votre espace.</p>
      </section>
    </div>
  </div>;
}
