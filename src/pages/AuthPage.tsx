import { useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Sparkles, UserRound } from 'lucide-react';
import { Brand } from '../components/Brand';
import { Notice } from '../components/Notice';
import { useAuth } from '../contexts/AuthContext';

export function AuthPage() {
  const { signIn, signUp, resetPassword, signInWithProvider, configured } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleProvider(provider: 'google' | 'apple') {
    setError(''); setSuccess(''); setBusy(true);
    try { await signInWithProvider(provider); }
    catch (e) { setError(e instanceof Error ? e.message : 'La connexion externe a échoué.'); }
    finally { setBusy(false); }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault(); setError(''); setSuccess(''); setBusy(true);
    try {
      if (mode === 'login') await signIn(email, password);
      else if (mode === 'signup') {
        const hasSession = await signUp(email, password, name);
        setSuccess(hasSession ? 'Votre compte est créé. Vous êtes connecté.' : 'Votre compte est créé. Consultez votre boîte email pour confirmer votre adresse, puis connectez-vous.');
        if (!hasSession) setMode('login');
      } else {
        await resetPassword(email);
        setSuccess('Un lien de réinitialisation a été envoyé si cette adresse correspond à un compte.');
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Une erreur est survenue.'); }
    finally { setBusy(false); }
  }

  return (
    <div className="auth-page">
      <div className="auth-art">
        <div className="auth-art-glow" />
        <Brand />
        <div className="auth-art-copy">
          <div className="gold-kicker"><Sparkles size={15} /> VOTRE ÉCOLE D’ÉLOQUENCE</div>
          <h1>Votre voix.<br /><em>Votre progression.</em></h1>
          <p>Développez votre diction, votre fluidité et votre éloquence grâce à un entraînement guidé.</p>
          <div className="auth-art-bottom"><span className="gold-line" /> <span>L’art de mieux s’exprimer.</span></div>
        </div>
        <div className="auth-orbit orbit-one" /><div className="auth-orbit orbit-two" />
      </div>
      <div className="auth-form-side">
        <div className="auth-mobile-brand"><Brand /></div>
        <div className="auth-form-wrap">
          <div className="auth-heading"><span className="eyebrow">BIENVENUE SUR Eloquia</span><h2>{mode === 'login' ? 'Ravi de vous revoir.' : mode === 'signup' ? 'Créez votre espace.' : 'Mot de passe oublié ?'}</h2><p>{mode === 'login' ? 'Connectez-vous pour reprendre votre progression.' : mode === 'signup' ? 'Commencez votre parcours de progression dès aujourd’hui.' : 'Nous vous enverrons un lien pour réinitialiser votre mot de passe.'}</p></div>
          {!configured && <Notice kind="error">Supabase n’est pas encore configuré. Ajoutez les variables <code>VITE_SUPABASE_URL</code> et <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> dans votre fichier <code>.env.local</code>.</Notice>}
          {error && <Notice kind="error">{error}</Notice>}
          {success && <Notice kind="success">{success}</Notice>}
          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === 'signup' && <label className="field-label">Nom affiché<div className="input-wrap"><UserRound size={17} /><input value={name} onChange={e => setName(e.target.value)} placeholder="Votre nom" autoComplete="name" required minLength={2} /></div></label>}
            <label className="field-label">Adresse email<div className="input-wrap"><Mail size={17} /><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@exemple.com" autoComplete="email" required /></div></label>
            {mode !== 'forgot' && <label className="field-label">Mot de passe<div className="input-wrap"><LockKeyhole size={17} /><input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="8 caractères minimum" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required minLength={8} /><button type="button" className="input-action" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>}
            {mode === 'login' && <div className="form-inline"><span>Accès sécurisé</span><button type="button" className="text-button" onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}>Mot de passe oublié ?</button></div>}
            <button type="submit" className="button button-gold button-full" disabled={!configured || busy}>{busy ? 'Veuillez patienter…' : mode === 'login' ? 'Se connecter' : mode === 'signup' ? 'Créer mon compte' : 'Envoyer le lien'} <ArrowRight size={17} /></button>
          </form>
          {mode !== 'forgot' && <><div className="auth-divider"><span /> ou continuer avec <span /></div><div className="oauth-row"><button className="button button-outline" disabled={!configured || busy} onClick={() => void handleProvider('google')}><GoogleMark /> Google</button><button className="button button-outline" disabled={!configured || busy} onClick={() => void handleProvider('apple')}><AppleMark /> Apple</button></div></>}
          <div className="auth-switch">{mode === 'login' ? <>Vous n’avez pas encore de compte ? <button onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}>Créer un compte</button></> : <>Vous avez déjà un compte ? <button onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>Se connecter</button></>}</div>
          <p className="auth-legal">En continuant, vous acceptez nos conditions d’utilisation et notre politique de confidentialité.</p>
        </div>
      </div>
    </div>
  );
}

function GoogleMark() { return <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.72-.06-1.25-.19-1.8H12v3.27h5.52a4.7 4.7 0 0 1-2.05 3.08v2.12h3.32c1.94-1.79 2.81-4.42 2.81-6.67Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.44l-3.32-2.12c-.9.6-2.05.96-3.3.96-2.6 0-4.8-1.75-5.59-4.1H3v2.18A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.41 14.3a6 6 0 0 1 0-3.6V8.52H3a10 10 0 0 0 0 7.96l3.41-2.18Z"/><path fill="#EA4335" d="M12 6.6c1.47 0 2.79.5 3.83 1.5l2.87-2.87C16.95 3.64 14.7 2.6 12 2.6a10 10 0 0 0-9 5.92l3.41 2.18C7.2 8.35 9.4 6.6 12 6.6Z"/></svg>; }
function AppleMark() { return <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="currentColor"><path d="M16.7 12.8c0-2.1 1.7-3.1 1.8-3.2-1-1.5-2.6-1.7-3.2-1.7-1.3-.1-2.5.8-3.2.8-.7 0-1.7-.8-2.8-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.8-.4 6.9 1.2 9.1.8 1.1 1.6 2.3 2.7 2.2 1.1 0 1.5-.7 2.9-.7 1.3 0 1.7.7 2.9.7 1.2 0 1.9-1.1 2.6-2.2.8-1.2 1.1-2.3 1.1-2.4 0 0-2.3-.9-2.3-4Zm-2.1-6.3c.6-.8 1-1.9.9-3-.9 0-2.1.6-2.8 1.4-.6.7-1.1 1.8-1 2.8 1.1.1 2.2-.5 2.9-1.2Z"/></svg>; }
