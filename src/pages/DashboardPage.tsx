import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Bot, CalendarCheck, Flame, Mic2, ScrollText, Sparkles, Target, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Brand } from '../components/Brand';
import { Notice } from '../components/Notice';
import { Loading } from '../components/Loading';
import { getProfile, listProgress } from '../lib/data';
import { PRACTICE_BANK } from '../lib/exerciseBank';
import { supabase } from '../lib/supabase';
import type { AppProfile } from '../lib/types';

type AttemptRow = { created_at?: string; xp_earned?: number | null; score?: number | null; exercise_id?: string };

function getLocalExerciseScores(userId: string): Record<string, number> {
  try {
    const value = JSON.parse(localStorage.getItem(`eloqia-exercise-scores:${userId}`) || '{}') as Record<string, unknown>;
    return Object.fromEntries(Object.entries(value).filter(([, score]) => typeof score === 'number').map(([id, score]) => [id, Number(score)]));
  } catch { return {}; }
}

function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function calculateStreak(dates: string[]): number {
  const unique = new Set(dates.map(value => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : localDayKey(date);
  }).filter(Boolean));
  const today = new Date();
  let cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  // A current series may continue from yesterday if the user has not practiced yet today.
  if (!unique.has(localDayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (unique.has(localDayKey(cursor)) && streak < 365) { streak += 1; cursor.setDate(cursor.getDate() - 1); }
  return streak;
}

async function readAttempts(table: 'exercise_attempts' | 'speaking_challenge_attempts' | 'reading_attempts', userId: string): Promise<AttemptRow[]> {
  if (!supabase) return [];
  try {
    const fields = table === 'exercise_attempts' ? 'exercise_id,created_at,xp_earned,score' : 'created_at,xp_earned,score';
    const { data, error } = await supabase.from(table).select(fields).eq('user_id', userId).order('created_at', { ascending: false }).limit(250);
    if (error) {
      // Exercise XP is added by an additive migration; older installations still load their history.
      const fallbackFields = table === 'exercise_attempts' ? 'exercise_id,created_at,score' : 'created_at,score';
      const fallback = await supabase.from(table).select(fallbackFields).eq('user_id', userId).order('created_at', { ascending: false }).limit(250);
      return fallback.error ? [] : (fallback.data ?? []) as AttemptRow[];
    }
    return (data ?? []) as AttemptRow[];
  } catch { return []; }
}

export function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [completed, setCompleted] = useState(0);

  useEffect(() => {
    if (!user) return;
    let active = true;
    async function load() {
      setLoading(true); setError('');
      try {
        const [profileRow, progressRows, exerciseAttempts, challengeAttempts, readingAttempts] = await Promise.all([
          getProfile(user!.id), listProgress(user!.id),
          readAttempts('exercise_attempts', user!.id),
          readAttempts('speaking_challenge_attempts', user!.id),
          readAttempts('reading_attempts', user!.id),
        ]);
        if (!active) return;
        setProfile(profileRow);
        const storedScores = getLocalExerciseScores(user!.id);
        const localMastered = PRACTICE_BANK.filter(item => (storedScores[item.id] ?? 0) >= 80).length;
        const remoteMastered = new Set(exerciseAttempts.filter(row => (row.score ?? 0) >= 80 && row.exercise_id).map(row => row.exercise_id)).size;
        const progressMastered = progressRows.filter(row => row.completed === true || row.status === 'completed' || Boolean(row.completed_at)).length;
        setCompleted(Math.min(PRACTICE_BANK.length, Math.max(localMastered, remoteMastered, progressMastered)));
        const allAttempts = [...exerciseAttempts, ...challengeAttempts, ...readingAttempts];
        // Exercise XP is the best validated score / 2, which also preserves totals
        // for attempts recorded before the xp_earned migration was installed.
        const bestExerciseScores = new Map<string, number>();
        for (const attempt of exerciseAttempts) if (attempt.exercise_id) bestExerciseScores.set(attempt.exercise_id, Math.max(bestExerciseScores.get(attempt.exercise_id) ?? 0, Number(attempt.score) || 0));
        const exerciseXp = [...bestExerciseScores.values()].reduce((sum, score) => sum + Math.round(Math.max(0, Math.min(100, score)) * .5), 0);
        const otherXp = [...challengeAttempts, ...readingAttempts].reduce((sum, row) => sum + (typeof row.xp_earned === 'number' ? Math.max(0, row.xp_earned) : 0), 0);
        setXp(exerciseXp + otherXp);
        const dates = [...allAttempts.map(row => row.created_at || ''), ...progressRows.map(row => row.created_at || row.completed_at || '')].filter(Boolean);
        setStreak(calculateStreak(dates));
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Impossible de charger votre espace pour le moment.');
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [user]);

  const firstName = String(profile?.display_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Orateur').split(/[\s._-]/)[0];
  const nextLevelAt = (Math.floor(xp / 500) + 1) * 500;
  const currentLevel = Math.floor(xp / 500) + 1;
  const currentLevelXp = xp % 500;
  const levelProgress = Math.min(100, Math.round(currentLevelXp / 500 * 100));
  const progressPercent = Math.min(100, Math.round(completed / PRACTICE_BANK.length * 100));
  const formattedDate = useMemo(() => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()), []);

  return <div className="page-stack eloqia-home-page">
    <div className="home-brand-row"><Brand /><div className="home-date"><CalendarCheck size={15} /> <span>{formattedDate}</span></div></div>
    {error && <Notice kind="info">{error}</Notice>}

    <section className="home-greeting">
      <div><span className="eyebrow">VOTRE ESPACE D’ENTRAÎNEMENT</span><h2>Bonjour {firstName} !</h2><p>Une petite séance aujourd’hui peut faire une grande différence à l’oral.</p></div>
      <div className="home-streak"><Flame size={21} /><strong>{streak}</strong><span>{streak > 1 ? 'jours de série' : 'jour de série'}</span></div>
    </section>

    <section className="home-progress-card" aria-label="Niveau et expérience">
      <div className="home-progress-main">
        <div className="home-level-emblem"><Trophy size={25} /></div>
        <div className="home-level-copy"><span>NIVEAU {currentLevel}</span><strong>{xp.toLocaleString('fr-FR')} XP</strong><div className="home-xp-track"><i style={{ width: `${levelProgress}%` }} /></div><small>{currentLevelXp} / 500 XP · {Math.max(0, nextLevelAt - xp)} XP avant le niveau suivant</small></div>
      </div>
      <div className="home-wave-art" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
    </section>

    <Link to="/coach" className="home-primary-cta"><span className="home-primary-icon"><Mic2 size={27} /></span><span><strong>Commencer mon entraînement</strong><small>Parler avec mon coach Eloquia</small></span><ArrowRight size={22} /></Link>

    <section className="home-tools-section">
      <div className="home-section-heading"><div><span className="eyebrow">POUR PROGRESSER</span><h3>Mes outils</h3></div><Link to="/exercises">Tout voir <ArrowRight size={16} /></Link></div>
      <div className="home-tool-grid">
        <Link to="/exercises" className="home-tool-card tool-exercises"><span><DumbbellIcon /></span><strong>Exercices</strong><small>Mon parcours</small></Link>
        <Link to="/coach" className="home-tool-card tool-coach"><span><Bot size={27} /></span><strong>Coach IA</strong><small>Dialogue vocal</small></Link>
        <Link to="/reading" className="home-tool-card tool-reading"><span><ScrollText size={26} /></span><strong>Téléprompteur</strong><small>Lire et progresser</small></Link>
        <Link to="/challenge" className="home-tool-card tool-challenge"><span><Trophy size={27} /></span><strong>Défi du jour</strong><small>1 minute pour convaincre</small></Link>
      </div>
    </section>

    <Link to="/progress" className="home-progress-link">
      <span className="home-progress-link-icon"><Target size={25} /></span>
      <span className="home-progress-link-copy"><strong>Ma progression</strong><small>{loading ? 'Mise à jour de vos résultats…' : `${completed} étape${completed > 1 ? 's' : ''} maîtrisée${completed > 1 ? 's' : ''} sur ${PRACTICE_BANK.length}`}</small><span className="home-completion-track"><i style={{ width: `${progressPercent}%` }} /></span></span>
      <span className="home-progress-percent">{loading ? '—' : `${progressPercent}%`}</span><ArrowRight size={19} />
    </Link>

    {loading && <Loading label="Synchronisation de votre progression…" />}
    <p className="home-encouragement"><Sparkles size={15} /> La régularité compte davantage que la perfection. Pratiquez à votre rythme.</p>
  </div>;
}

function DumbbellIcon() { return <BookOpen size={27} />; }
