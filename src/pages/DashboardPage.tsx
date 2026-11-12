import { useEffect, useState, type ReactNode } from 'react';
import { ArrowRight, BookOpen, CalendarDays, BarChart3, Clock3, Flame, MessageCircle, Sparkles, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { countRows, getProfile, listExercises, listProgress } from '../lib/data';
import type { AppProfile, Exercise, ProgressEntry } from '../lib/types';
import { Notice } from '../components/Notice';
import { Loading } from '../components/Loading';

export function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [exerciseCount, setExerciseCount] = useState(0);
  const [conversationCount, setConversationCount] = useState(0);
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [recentExercises, setRecentExercises] = useState<Exercise[]>([]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    async function load() {
      setLoading(true); setError('');
      try {
        const [p, exercises, conversations, progressRows] = await Promise.all([
          getProfile(user!.id), countRows('exercises'), countRows('conversations', user!.id), listProgress(user!.id),
        ]);
        if (!active) return;
        setProfile(p); setExerciseCount(exercises); setConversationCount(conversations); setProgress(progressRows);
        setRecentExercises((await listExercises()).slice(0, 3));
      } catch (e) { if (active) setError(e instanceof Error ? e.message : 'Impossible de charger vos données.'); }
      finally { if (active) setLoading(false); }
    }
    void load(); return () => { active = false; };
  }, [user]);

  const completed = progress.filter(p => p.completed === true || p.status === 'completed' || Boolean(p.completed_at)).length;
  const minutes = progress.reduce((sum, p) => sum + (typeof p.duration_minutes === 'number' ? p.duration_minutes : typeof p.duration_seconds === 'number' ? p.duration_seconds / 60 : 0), 0);
  const firstName = String(profile?.display_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Apprenant').split(' ')[0];

  return <div className="page-stack">
    {error && <Notice kind="error">{error}</Notice>}
    <section className="welcome-panel">
      <div className="welcome-copy"><div className="gold-kicker"><Sparkles size={14} /> VOTRE PARCOURS COMMENCE ICI</div><h2>Bonjour, {firstName}.</h2><p>Chaque conversation est une occasion de progresser. Prêt à travailler votre expression aujourd’hui ?</p><div className="welcome-actions"><Link to="/coach" className="button button-gold">Parler avec mon coach <ArrowRight size={16} /></Link><Link to="/exercises" className="button button-ghost">Explorer les exercices</Link></div></div>
      <div className="welcome-visual"><div className="sound-orb"><span /><span /><span /><span /><span /><span /><span /></div><div className="orb-caption"><span className="live-dot" /> VOTRE ESPACE COACH</div></div>
    </section>

    <div className="section-heading"><div><span className="eyebrow">VOTRE ACTIVITÉ</span><h3>Vue d’ensemble</h3></div><span className="muted-small"><CalendarDays size={14} /> {new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</span></div>
    {loading ? <Loading label="Synchronisation de votre espace…" /> : <div className="stats-grid">
      <StatCard label="Exercices disponibles" value={String(exerciseCount)} note="Dans votre bibliothèque" icon={<BookOpen size={19} />} />
      <StatCard label="Exercices terminés" value={String(completed)} note="D’après votre historique" icon={<Target size={19} />} />
      <StatCard label="Temps de pratique" value={`${Math.round(minutes)} min`} note="Temps enregistré" icon={<Clock3 size={19} />} />
      <StatCard label="Conversations" value={String(conversationCount)} note="Avec votre coach IA" icon={<MessageCircle size={19} />} />
    </div>}

    <div className="dashboard-grid">
      <section className="panel panel-large">
        <div className="panel-heading"><div><span className="eyebrow">À VOTRE RYTHME</span><h3>Reprendre l’apprentissage</h3></div><Link to="/exercises" className="subtle-link">Tous les exercices <ArrowRight size={14} /></Link></div>
        {loading ? <div className="panel-placeholder"><Loading /></div> : recentExercises.length ? <div className="recent-list">{recentExercises.map((exercise, index) => <ExerciseRow key={exercise.id} exercise={exercise} index={index} />)}</div> : <EmptyPanel icon={<BookOpen size={22} />} title="Votre bibliothèque se prépare" text="Les exercices publiés dans Supabase apparaîtront ici. Aucun contenu fictif n’est affiché." action={<Link to="/exercises" className="subtle-link">Ouvrir la bibliothèque <ArrowRight size={14} /></Link>} />}
      </section>
      <section className="panel daily-panel">
        <div className="daily-top"><div className="daily-icon"><Flame size={19} /></div><span className="tag tag-gold">OBJECTIF DU JOUR</span></div>
        <h3>Un petit pas<br />chaque jour.</h3>
        <p>Choisissez un exercice ou démarrez une conversation pour pratiquer une langue.</p>
        <div className="daily-separator" />
        <div className="daily-actions"><Link to="/coach"><MessageCircle size={16} /> Démarrer une conversation <ArrowRight size={15} /></Link><Link to="/progress"><BarChart3 size={16} /> Consulter ma progression <ArrowRight size={15} /></Link></div>
      </section>
    </div>

    <section className="bottom-callout"><div className="callout-icon"><Sparkles size={18} /></div><div><strong>Votre coach s’adapte à votre niveau.</strong><p>Posez vos questions, demandez une correction ou entraînez-vous sur une situation concrète.</p></div><Link to="/coach" className="button button-outline">Accéder au coach <ArrowRight size={15} /></Link></section>
  </div>;
}

function StatCard({ label, value, note, icon }: { label: string; value: string; note: string; icon: ReactNode }) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div><strong>{value}</strong><small>{note}</small></div>;
}

function ExerciseRow({ exercise, index }: { exercise: Exercise; index: number }) {
  const title = String(exercise.title || exercise.name || exercise.slug || 'Exercice sans titre');
  const subtitle = String(exercise.description || exercise.instructions || exercise.category || 'Consultez les consignes de cet exercice.');
  return <div className="recent-row"><div className={`exercise-index exercise-index-${index + 1}`}>{String(index + 1).padStart(2, '0')}</div><div className="recent-row-copy"><strong>{title}</strong><span>{subtitle}</span></div><div className="row-meta">{exercise.level || exercise.difficulty || 'À découvrir'}</div></div>;
}

export function EmptyPanel({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return <div className="empty-panel"><div className="empty-icon">{icon}</div><strong>{title}</strong><p>{text}</p>{action}</div>;
}
