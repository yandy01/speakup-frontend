import { useState, type FormEvent } from 'react';
import { LockKeyhole, Save } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Brand } from '../components/Brand';
import { Notice } from '../components/Notice';

export function ResetPasswordPage() {
  const { updatePassword, configured } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return; }
    if (password !== confirmation) { setError('Les deux mots de passe ne correspondent pas.'); return; }
    setBusy(true);
    try { await updatePassword(password); setSuccess(true); }
    catch (e) { setError(e instanceof Error ? e.message : 'La modification a échoué.'); }
    finally { setBusy(false); }
  }

  return <div className="reset-page"><div className="reset-card"><Brand /><span className="eyebrow">SÉCURITÉ DU COMPTE</span><h1>Choisissez un nouveau mot de passe</h1><p>Utilisez au moins 8 caractères et évitez un mot de passe déjà utilisé ailleurs.</p>{error && <Notice kind="error">{error}</Notice>}{success ? <><Notice kind="success">Votre mot de passe a été modifié. Vous pouvez maintenant vous connecter.</Notice><Link className="button button-gold button-full" to="/">Retour à Eloquia</Link></> : <form className="auth-form" onSubmit={submit}><label className="field-label">Nouveau mot de passe<div className="input-wrap"><LockKeyhole size={17} /><input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" /></div></label><label className="field-label">Confirmer le mot de passe<div className="input-wrap"><LockKeyhole size={17} /><input type="password" value={confirmation} onChange={e => setConfirmation(e.target.value)} required minLength={8} autoComplete="new-password" /></div></label><button className="button button-gold button-full" disabled={!configured || busy}><Save size={16} /> {busy ? 'Enregistrement…' : 'Modifier le mot de passe'}</button></form>}</div></div>;
}
