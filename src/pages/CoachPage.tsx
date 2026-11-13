import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { AudioLines, Bot, Check, MessageCircle, Mic, MicOff, Plus, Send, Volume2, VolumeX } from 'lucide-react';
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

export function CoachPage() {
  const { user, session } = useAuth(); const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]); const [selected, setSelected] = useState<Conversation | null>(null); const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [draft, setDraft] = useState(''); const [loading, setLoading] = useState(true); const [sending, setSending] = useState(false); const [error, setError] = useState('');
  const [voiceReplies, setVoiceReplies] = useState(true); const [voice, setVoice] = useState<VoicePreset>(getStoredVoice);
  const [recording, setRecording] = useState(false); const [transcribing, setTranscribing] = useState(false); const [speaking, setSpeaking] = useState(false); const [voiceFallback, setVoiceFallback] = useState(false);
  const streamRef = useRef<MediaStream | null>(null); const recorderRef = useRef<MediaRecorder | null>(null); const chunksRef = useRef<BlobPart[]>([]); const audioRef = useRef<HTMLAudioElement | null>(null); const audioUrlRef = useRef('');

  useEffect(() => { let alive = true; if (!user) return; listConversations(user.id).then(rows => { if (alive) setConversations(rows); }).catch(e => { if (alive) setError(e instanceof Error ? e.message : 'Impossible de charger les conversations.'); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, [user]);
  useEffect(() => { const id = searchParams.get('conversation'); if (!id || !conversations.length) return; const match = conversations.find(row => row.id === id); if (match && selected?.id !== match.id) setSelected(match); }, [searchParams, conversations, selected]);
  useEffect(() => { if (!selected || !user) { setMessages([]); return; } let alive = true; listMessages(selected.id, user.id).then(rows => { if (!alive) return; setMessages(rows.map((row, i) => ({ id: String(row.id || `${selected.id}-${i}`), role: (row.role === 'assistant' || row.sender === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user', content: String(row.content || row.message || ''), created_at: typeof row.created_at === 'string' ? row.created_at : undefined })).filter(row => row.content)); }).catch(e => { if (alive) setError(e instanceof Error ? e.message : 'Impossible de charger les messages.'); }); return () => { alive = false; }; }, [selected, user]);
  useEffect(() => () => { streamRef.current?.getTracks().forEach(track => track.stop()); if (recorderRef.current && recorderRef.current.state !== 'inactive') { try { recorderRef.current.stop(); } catch { /* déjà arrêté */ } } window.speechSynthesis?.cancel(); audioRef.current?.pause(); if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current); }, []);

  function stopMicrophone() { streamRef.current?.getTracks().forEach(track => track.stop()); streamRef.current = null; if (recorderRef.current && recorderRef.current.state !== 'inactive') { try { recorderRef.current.stop(); } catch { /* déjà arrêté */ } } recorderRef.current = null; setRecording(false); }
  async function playVoice(text: string, preset: VoicePreset, announceError = true) {
    if (!session || !text.trim()) return;
    setSpeaking(true); setVoiceFallback(false);
    try {
      const blob = await synthesizeFrenchSpeech(session, text, preset);
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      const url = URL.createObjectURL(blob); audioUrlRef.current = url;
      const audio = audioRef.current || new Audio(); audioRef.current = audio; audio.src = url;
      audio.onended = () => setSpeaking(false); audio.onerror = () => setSpeaking(false);
      await audio.play();
    } catch (e) {
      setSpeaking(false); setVoiceFallback(true);
      if (announceError) setError(e instanceof Error ? `${e.message} La réponse écrite reste disponible.` : 'La voix du professeur est indisponible.');
    }
  }
  async function playCoachVoice(text: string) { if (voiceReplies) await playVoice(text, voice); }
  async function previewVoice() { await playVoice('Bonjour. Je suis ton professeur ELOQIA. Nous allons travailler ta diction, ta fluidité et ton éloquence.', voice, true); }
  async function getConversation() {
    if (!user) throw new Error('Connecte-toi pour démarrer une conversation.');
    if (selected) return selected;
    const row = await createConversation(user.id, 'Conversation avec ELOQIA', 'fr'); setSelected(row); setConversations(old => [row, ...old]); return row;
  }
  async function submitTutorMessage(content: string) {
    if (!user || !session || sending) return;
    setSending(true); setError('');
    try {
      const conversation = await getConversation();
      const savedUser = await saveMessage({ conversationId: conversation.id, userId: user.id, role: 'user', content });
      setMessages(old => [...old, { id: String(savedUser.id || Date.now()), role: 'user', content }]);
      const reply = await askSpeakUpCoach(session, conversation.id, content, 'fr');
      const savedAssistant = await saveMessage({ conversationId: conversation.id, userId: user.id, role: 'assistant', content: reply });
      setMessages(old => [...old, { id: String(savedAssistant.id || `${Date.now()}-assistant`), role: 'assistant', content: reply }]);
      if (voiceReplies) await playCoachVoice(reply);
    } catch (e) { setError(e instanceof Error ? e.message : 'Le professeur n’a pas pu répondre.'); }
    finally { setSending(false); }
  }
  async function sendText(event?: FormEvent) { event?.preventDefault(); const content = draft.trim(); if (!content) return; setDraft(''); await submitTutorMessage(content); }
  async function startVoiceCapture() {
    setError('');
    if (recording) { recorderRef.current?.stop(); return; }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { setError('L’enregistrement vocal n’est pas disponible dans ce navigateur. Ouvre ELOQIA en HTTPS et autorise le microphone.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      const mimeType = supportedRecorderMime(); const recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 64_000 } : { audioBitsPerSecond: 64_000 });
      streamRef.current = stream; recorderRef.current = recorder; chunksRef.current = [];
      recorder.ondataavailable = event => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onerror = () => { setError('L’enregistrement a été interrompu.'); stopMicrophone(); };
      recorder.onstop = () => { const blob = new Blob(chunksRef.current, { type: (recorder.mimeType || mimeType || 'audio/webm').split(';')[0] }); stream.getTracks().forEach(t => t.stop()); streamRef.current = null; recorderRef.current = null; setRecording(false); if (blob.size) void handleVoiceBlob(blob); };
      recorder.start(400); setRecording(true);
    } catch (e) { const name = e instanceof Error ? e.name : ''; setError(name === 'NotAllowedError' ? 'Accès au microphone refusé. Autorise-le dans les réglages du navigateur.' : 'Impossible d’ouvrir le microphone. Vérifie les autorisations et réessaie.'); }
  }
  async function handleVoiceBlob(blob: Blob) {
    if (!session) return; setTranscribing(true); setError('');
    try { const transcript = await transcribeFrenchAudio(session, blob); await submitTutorMessage(transcript); }
    catch (e) { setError(e instanceof Error ? e.message : 'La voix n’a pas pu être comprise.'); }
    finally { setTranscribing(false); }
  }
  const welcome = useMemo(() => 'Bonjour ! Je suis ton professeur ELOQIA. Nous allons travailler ta diction, ta fluidité, ta structure et ton éloquence. Tu peux me parler directement avec le microphone ou m’écrire.', []);

  return <div className="coach-layout eloqia-coach-layout">
    <aside className="conversation-sidebar panel"><div className="conversation-sidebar-head"><div><span className="eyebrow">TON ESPACE PERSONNEL</span><h3>Mes échanges</h3></div><button className="small-icon-button" onClick={() => { setSelected(null); setMessages([]); setError(''); }} title="Nouvelle conversation"><Plus size={18}/></button></div><button className="new-chat-button" onClick={() => { setSelected(null); setMessages([]); setError(''); }}><Plus size={16}/> Nouvelle conversation</button><div className="conversation-list">{loading ? <Loading label="Chargement…"/> : conversations.length ? conversations.map(row => <button key={row.id} className={`conversation-item ${selected?.id === row.id ? 'selected' : ''}`} onClick={() => setSelected(row)}><MessageCircle size={16}/><span>{String(row.title || 'Conversation')}</span></button>) : <div className="conversation-empty">Tes échanges apparaîtront ici.</div>}</div><div className="coach-voice-setting"><label htmlFor="coach-voice">Voix du professeur</label><select id="coach-voice" value={voice} onChange={e => { const v = e.target.value as VoicePreset; setVoice(v); localStorage.setItem('eloqia-voice', v); }}><option value="Achernar">Voix féminine · Achernar</option><option value="Charon">Voix masculine · Charon</option></select><button type="button" className="voice-preview-button" onClick={() => void previewVoice()} disabled={!session || speaking}><Volume2 size={15}/> Écouter cette voix</button><small>Voix françaises synthétiques. Choisis le timbre qui te convient.</small></div></aside>
    <section className="coach-main panel eloqia-coach-main">
      <div className="coach-header"><div className={`eloqia-teacher-orb ${recording ? 'is-listening' : ''} ${speaking ? 'is-speaking' : ''}`}><span/><span/><span/><span/><span/></div><div><strong>Ton professeur ELOQIA</strong><span><i className="live-dot"/> {recording ? 'Je t’écoute…' : speaking ? 'Je te réponds…' : transcribing ? 'Je prépare ta réponse…' : 'Disponible pour t’entraîner'}</span></div><div className="coach-header-right"><button className="voice-mode-toggle" onClick={() => { setVoiceReplies(v => !v); if (!voiceReplies) return; audioRef.current?.pause(); setSpeaking(false); }} title={voiceReplies ? 'Désactiver les réponses vocales' : 'Activer les réponses vocales'}>{voiceReplies ? <Volume2 size={16}/> : <VolumeX size={16}/>}<span>{voiceReplies ? 'Voix activée' : 'Voix désactivée'}</span></button></div></div>
      {error && <div className="coach-error"><Notice kind="error">{error}</Notice></div>}
      {voiceFallback && <Notice kind="info">Le texte du professeur est disponible. Tu peux réessayer la lecture vocale avec le bouton « Écouter ».</Notice>}
      <div className="chat-scroll">
        {messages.length === 0 ? <div className="coach-welcome"><div className={`eloqia-large-wave ${recording ? 'active' : speaking ? 'speaking' : ''}`}><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div><span className="eyebrow">TON COACH D’ÉLOQUENCE</span><h2>Parlons. <em>Je t’écoute.</em></h2><p>{welcome}</p><div className="suggestion-grid"><button onClick={() => setDraft('Aide-moi à améliorer ma diction avec un exercice progressif.')}> <span>01</span><strong>Travailler ma diction</strong></button><button onClick={() => setDraft('Fais-moi pratiquer une présentation personnelle d’une minute.')}> <span>02</span><strong>Me présenter clairement</strong></button><button onClick={() => setDraft('Apprends-moi à structurer une opinion avec des arguments.')}> <span>03</span><strong>Argumenter</strong></button><button onClick={() => setDraft('Fais une simulation de prise de parole professionnelle.')}> <span>04</span><strong>Simuler une présentation</strong></button></div></div> : <div className="message-list">{messages.map(message => <div key={message.id} className={`message-row ${message.role}`}><span className="message-avatar">{message.role === 'assistant' ? <Bot size={16}/> : <span>MOI</span>}</span><div className="message-bubble">{message.role === 'assistant' ? <CoachMessage content={message.content}/> : <p>{message.content}</p>}{message.role === 'assistant' && <button className="message-speak" onClick={() => void playCoachVoice(message.content)}><Volume2 size={15}/> Écouter</button>}</div></div>)}{sending && <div className="message-row assistant"><span className="message-avatar"><Bot size={16}/></span><div className="message-bubble typing"><i/><i/><i/></div></div>}</div>}
      </div>
      <div className="coach-voice-dock"><div className={`eloqia-live-wave ${recording ? 'active' : transcribing ? 'thinking' : speaking ? 'speaking' : ''}`}><i/><i/><i/><i/><i/><i/><i/><i/><i/></div><div className="coach-voice-dock-copy"><strong>{recording ? 'Parle naturellement' : speaking ? 'Le professeur parle' : transcribing ? 'Je comprends ta voix' : 'Prêt pour un échange vocal ?'}</strong><span>{recording ? 'Appuie sur le bouton pour terminer ton intervention.' : 'Appuie pour parler. Le professeur te répond à voix haute.'}</span></div><button type="button" className={`coach-mic-button ${recording ? 'recording' : ''}`} onClick={() => void startVoiceCapture()} disabled={sending || transcribing} aria-label={recording ? 'Terminer la prise de parole' : 'Parler au professeur'}>{recording ? <MicOff size={22}/> : <Mic size={22}/>}</button></div>
      <form className="chat-composer" onSubmit={sendText}><textarea value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendText(); } }} placeholder="Ou écris ton message au professeur…" rows={1}/><div className="composer-bottom"><span><AudioLines size={14}/> Dialogue vocal et écrit · Français</span><div className="composer-actions"><button className="send-button" type="submit" disabled={!draft.trim() || sending || transcribing} aria-label="Envoyer"><Send size={17}/></button></div></div></form>
      <div className="chat-footnote">Tes échanges sont enregistrés dans ton espace. Tu peux arrêter la voix à tout moment.</div>
    </section>
  </div>;
}
