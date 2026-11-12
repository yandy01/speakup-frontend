import { useEffect, useState, type FormEvent } from 'react';
import { Check, Globe2, Mail, Save, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getProfile, updateProfile } from '../lib/data';
import type { AppProfile } from '../lib/types';
import { Loading } from '../components/Loading';
import { Notice } from '../components/Notice';

export function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [name, setName] = useState('');
  const [nativeLanguage, setNativeLanguage] = useState('fr');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [level, setLevel] = useState('beginner');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!user) return;
    let active = true;
    getProfile(user.id).then(data => {
      if (!active) return;
      setProfile(data);
      setName(String(data?.display_name || user.user_metadata?.display_name || ''));
      setNativeLanguage(String(data?.native_language || data?.preferred_language || 'fr'));
      setTargetLanguage(String(data?.target_language || 'en'));
      setLevel(String(data?.level || 'beginner'));
    }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Impossible de charger le profil.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  async function save(event: FormEvent) {
    event.preventDefault(); if (!user) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const patch: Record<string, unknown> = { display_name: name.trim(), native_language: nativeLanguage, target_language: targetLanguage, level };
      const updated = await updateProfile(user.id, profile, patch);
      setProfile(updated); setSuccess('Votre profil a été mis à jour.');
    } catch (e) { setError(e instanceof Error ? e.message : 'La sauvegarde a échoué.'); }
    finally { setSaving(false); }
  }

  return <div className="page-stack">
    <section className="page-intro-row"><div><span className="eyebrow">VOTRE COMPTE</span><h2>Mon profil</h2><p>Personnalisez votre espace et vos préférences d’apprentissage.</p></div><div className="intro-medallion"><UserRound size={25} /></div></section>
    {loading ? <Loading label="Chargement du profil…" /> : <div className="profile-layout">
      <section className="panel profile-main"><div className="panel-heading"><div><span className="eyebrow">INFORMATIONS PERSONNELLES</span><h3>Vos informations</h3></div><div className="profile-avatar">{name.trim().slice(0, 2).toUpperCase() || 'SU'}</div></div>
        {error && <Notice kind="error">{error}</Notice>}{success && <Notice kind="success">{success}</Notice>}
        <form className="profile-form" onSubmit={save}>
          <label className="field-label">Nom affiché<div className="input-wrap"><UserRound size={17} /><input value={name} onChange={e => setName(e.target.value)} placeholder="Votre nom" minLength={2} required /></div></label>
          <label className="field-label">Adresse email<div className="input-wrap input-disabled"><Mail size={17} /><input value={user?.email || ''} readOnly /></div><small>L’adresse email est gérée par votre compte d’authentification.</small></label>
          <div className="form-grid-two"><label className="field-label">Langue principale<div className="select-wrap"><Globe2 size={16} /><select value={nativeLanguage} onChange={e => setNativeLanguage(e.target.value)}><option value="fr">Français</option><option value="en">English</option></select></div></label><label className="field-label">Langue à apprendre<div className="select-wrap"><Globe2 size={16} /><select value={targetLanguage} onChange={e => setTargetLanguage(e.target.value)}><option value="en">English</option><option value="fr">Français</option></select></div></label></div>
          <label className="field-label">Votre niveau actuel<div className="select-wrap"><Check size={16} /><select value={level} onChange={e => setLevel(e.target.value)}><option value="beginner">Débutant</option><option value="intermediate">Intermédiaire</option><option value="advanced">Avancé</option><option value="unknown">Je ne sais pas</option></select></div></label>
          <div className="form-actions"><button className="button button-gold" type="submit" disabled={saving}><Save size={16} /> {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}</button></div>
        </form>
      </section>
      <aside className="profile-side"><div className="panel security-panel"><div className="security-icon"><ShieldCheck size={21} /></div><h3>Votre espace est privé</h3><p>Vos informations sont associées à votre compte. Les accès aux données sont protégés par les règles RLS configurées dans Supabase.</p><span className="security-label"><i /> Session authentifiée</span></div><div className="panel profile-note"><span className="eyebrow">PRÉFÉRENCES</span><h3>Apprendre à votre rythme</h3><p>Les préférences avancées, les rappels et la gestion de la confidentialité seront ajoutés au fil des prochaines étapes.</p></div></aside>
    </div>}
  </div>;
}
