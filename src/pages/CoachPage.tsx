import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowUp, Bot, MessageCircle, Plus, Send, Sparkles, UserRound, Volume2, VolumeX, Mic, MicOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { createConversation, listConversations, listMessages, saveMessage } from '../lib/data';
import { askSpeakUpCoach, isAiBackendConfigured } from '../lib/ai';
import type { Conversation } from '../lib/types';
import { Notice } from '../components/Notice';
import { Loading } from '../components/Loading';
import { CoachMessage } from '../components/CoachMessage';

interface DisplayMessage { id: string; role: 'user' | 'assistant'; content: string; created_at?: string }

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
  const [language, setLanguage] = useState('fr');
  const [voiceReplies, setVoiceReplies] = useState(true);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    listConversations(user.id).then(rows => { if (active) setConversations(rows); }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Impossible de charger les conversations.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    const conversationId = searchParams.get('conversation');
    if (!conversationId || !conversations.length) return;
    const matching = conversations.find(row => row.id === conversationId);
    if (matching && selected?.id !== matching.id) setSelected(matching);
  }, [searchParams, conversations, selected]);

  useEffect(() => {
    if (selected?.language === 'fr' || selected?.language === 'en') setLanguage(selected.language);
  }, [selected]);

  useEffect(() => {
    if (!selected || !user) { setMessages([]); return; }
    let active = true;
    listMessages(selected.id, user.id).then(rows => {
      if (!active) return;
      const mapped = rows.map((row, index) => ({
        id: String(row.id || `${selected.id}-${index}`),
        role: (row.role === 'assistant' || row.sender === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: String(row.content || row.message || ''),
        created_at: typeof row.created_at === 'string' ? row.created_at : undefined,
      })).filter(row => row.content);
      setMessages(mapped);
    }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Impossible de charger les messages.'); });
    return () => { active = false; };
  }, [selected, user]);

  const greeting = useMemo(() => language === 'fr'
    ? 'Bonjour ! Je suis votre coach SpeakUp. Que souhaitez-vous travailler aujourd’hui : votre expression, votre grammaire ou votre vocabulaire ?'
    : 'Hello! I’m your SpeakUp coach. What would you like to practise today: speaking, grammar or vocabulary?', [language]);

  function speak(text: string) {
    if (!("speechSynthesis" in window)) { setError('La lecture vocale n’est pas disponible dans ce navigateur.'); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/[*#`]/g, ''));
    utterance.lang = language === 'en' ? 'en-US' : 'fr-FR'; utterance.rate = 0.96;
    window.speechSynthesis.speak(utterance);
  }

  function startVoiceInput() {
    const SpeechRecognitionCtor = (window as Window & { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any }).SpeechRecognition || (window as Window & { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) { setError('La dictée vocale n’est pas prise en charge ici. Utilisez le bouton de saisie ou un navigateur compatible.'); return; }
    const recognition = new SpeechRecognitionCtor(); recognition.lang = language === 'en' ? 'en-US' : 'fr-FR'; recognition.interimResults = false; recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => { const text = event.results?.[0]?.[0]?.transcript; if (text) setDraft(current => `${current}${current ? ' ' : ''}${text}`); };
    recognition.onerror = () => setError('La reconnaissance vocale a échoué. Vérifiez l’autorisation du microphone.');
    recognition.onend = () => setListening(false); setListening(true); recognition.start();
  }

  async function newConversation() {
    if (!user) return;
    setError('');
    try {
      const row = await createConversation(user.id, 'Nouvelle conversation', language);
      setConversations(old => [row, ...old]); setSelected(row); setMessages([]);
    } catch (e) { setError(e instanceof Error ? e.message : 'Impossible de créer la conversation.'); }
  }

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    const content = draft.trim();
    if (!content || !user || !session || sending) return;
    setError(''); setSending(true); setDraft('');
    try {
      let conversation = selected;
      if (!conversation) {
        conversation = await createConversation(user.id, content.slice(0, 48), language);
        setSelected(conversation); setConversations(old => [conversation!, ...old]);
      }
      const userMessage = await saveMessage({ conversationId: conversation.id, userId: user.id, role: 'user', content });
      setMessages(old => [...old, { id: String(userMessage.id || `${Date.now()}`), role: 'user', content }]);
      try {
        const reply = await askSpeakUpCoach(session, conversation.id, content, language as 'fr' | 'en');
        const assistantMessage = await saveMessage({ conversationId: conversation.id, userId: user.id, role: 'assistant', content: reply });
        setMessages(old => [...old, { id: String(assistantMessage.id || `${Date.now()}-assistant`), role: 'assistant', content: reply }]);
        if (voiceReplies) speak(reply);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Le coach IA n’a pas pu répondre.');
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Votre message n’a pas pu être enregistré.'); setDraft(content); }
    finally { setSending(false); }
  }

  return <div className="coach-layout">
    <aside className="conversation-sidebar panel">
      <div className="conversation-sidebar-head"><div><span className="eyebrow">VOTRE ESPACE IA</span><h3>Conversations</h3></div><button className="small-icon-button" onClick={() => void newConversation()} title="Nouvelle conversation"><Plus size={18} /></button></div>
      <button className="new-chat-button" onClick={() => void newConversation()}><Plus size={16} /> Nouvelle conversation</button>
      <div className="conversation-list">
        {loading ? <Loading label="Chargement…" /> : conversations.length ? conversations.map(row => <button key={row.id} className={`conversation-item ${selected?.id === row.id ? 'selected' : ''}`} onClick={() => setSelected(row)}><MessageCircle size={16} /><span>{String(row.title || 'Conversation')}</span></button>) : <div className="conversation-empty">Vos échanges apparaîtront ici.</div>}
      </div>
      <div className="coach-language"><label htmlFor="coach-language">Langue de pratique</label><select id="coach-language" value={language} onChange={e => setLanguage(e.target.value)}><option value="fr">Français</option><option value="en">English</option></select></div>
    </aside>

    <section className="coach-main panel">
      <div className="coach-header"><div className="coach-avatar"><Bot size={21} /></div><div><strong>Coach SpeakUp</strong><span><i className="live-dot" /> Assistant pédagogique</span></div><div className="coach-header-right"><button className="voice-mode-toggle" onClick={() => { setVoiceReplies(value => !value); window.speechSynthesis?.cancel(); }} title={voiceReplies ? 'Désactiver les réponses vocales' : 'Activer les réponses vocales'}>{voiceReplies ? <Volume2 size={16}/> : <VolumeX size={16}/>}<span>{voiceReplies ? 'Voix activée' : 'Voix désactivée'}</span></button><span className={`status-chip ${isAiBackendConfigured ? 'status-ready' : 'status-pending'}`}>{isAiBackendConfigured ? 'Service configuré' : 'Connexion IA à terminer'}</span></div></div>
      {error && <div className="coach-error"><Notice kind="error">{error}</Notice></div>}
      <div className="chat-scroll">
        {!selected && messages.length === 0 ? <div className="coach-welcome"><div className="coach-welcome-icon"><Sparkles size={28} /></div><span className="eyebrow">VOTRE COACH PERSONNEL</span><h2>Que souhaitez-vous<br /><em>améliorer aujourd’hui ?</em></h2><p>Pratiquez une langue, posez une question ou demandez une correction personnalisée.</p><div className="suggestion-grid"><button onClick={() => setDraft('Aide-moi à me présenter en anglais de manière naturelle.')}> <span>01</span><strong>Me présenter en anglais</strong><ArrowUp size={15} /></button><button onClick={() => setDraft('Corrige cette phrase et explique-moi mes erreurs : …')}> <span>02</span><strong>Corriger mes phrases</strong><ArrowUp size={15} /></button><button onClick={() => setDraft('Propose-moi un exercice de vocabulaire adapté à mon niveau.')}> <span>03</span><strong>Enrichir mon vocabulaire</strong><ArrowUp size={15} /></button><button onClick={() => setDraft('Fais une simulation d’entretien d’embauche avec moi.')}> <span>04</span><strong>Simuler un entretien</strong><ArrowUp size={15} /></button></div></div> : <div className="message-list">
          {messages.length === 0 && <div className="message-bubble assistant"><span className="message-avatar"><Bot size={15} /></span><p>{greeting}</p></div>}
          {messages.map(message => <div key={message.id} className={`message-row ${message.role}`}><span className="message-avatar">{message.role === 'assistant' ? <Bot size={15} /> : <UserRound size={15} />}</span><div className="message-bubble">{message.role === 'assistant' ? <CoachMessage content={message.content}/> : <p>{message.content}</p>}{message.role === 'assistant' && <button className="message-speak" onClick={() => speak(message.content)} aria-label="Écouter la réponse"><Volume2 size={15}/> Écouter</button>}</div></div>)}
          {sending && <div className="message-row assistant"><span className="message-avatar"><Bot size={15} /></span><div className="message-bubble typing"><i /><i /><i /></div></div>}
        </div>}
      </div>
      <form className="chat-composer" onSubmit={sendMessage}><textarea value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }} placeholder={language === 'fr' ? 'Écrivez votre message à votre coach…' : 'Write a message to your coach…'} rows={1} /><div className="composer-bottom"><span><Sparkles size={13} /> Tuteur vocal et écrit</span><div className="composer-actions"><button type="button" className={`voice-input-button ${listening ? 'listening' : ''}`} onClick={startVoiceInput} aria-label="Dicter un message">{listening ? <MicOff size={18}/> : <Mic size={18}/>}</button><button className="send-button" type="submit" disabled={!draft.trim() || sending} aria-label="Envoyer"><Send size={17} /></button></div></div></form>
      <div className="chat-footnote">Vérifiez les corrections importantes : l’IA peut parfois se tromper.</div>
    </section>
  </div>;
}
