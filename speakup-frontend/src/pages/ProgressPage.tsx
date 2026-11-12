import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Award, BarChart3, Clock3, Target, TrendingUp } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { listProgress } from '../lib/data';
import type { ProgressEntry } from '../lib/types';
import { Loading } from '../components/Loading';
import { Notice } from '../components/Notice';
import { EmptyPanel } from './DashboardPage';

export function ProgressPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!user) return;
    let active = true;
    listProgress(user.id).then(data => { if (active) setRows(data); }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Impossible de charger la progression.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  const completed = rows.filter(row => row.completed === true || row.status === 'completed' || Boolean(row.completed_at));
  const scores = rows.map(row => typeof row.score === 'number' ? row.score : null).filter((score): score is number => score !== null);
  const average = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null;
  const chartData = useMemo(() => {
    const sorted = [...rows].filter(row => row.created_at).sort((a, b) => new Date(a.created_at!).getTime() - new Date(b.created_at!).getTime());
    return sorted.map(row => ({ date: new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(new Date(row.created_at!)), score: typeof row.score === 'number' ? row.score : null }));
  }, [rows]);
  const totalMinutes = rows.reduce((sum, row) => sum + (typeof row.duration_minutes === 'number' ? row.duration_minutes : typeof row.duration_seconds === 'number' ? row.duration_seconds / 60 : 0), 0);

  return <div className="page-stack">
    <section className="page-intro-row"><div><span className="eyebrow">MES RÉSULTATS</span><h2>Votre progression</h2><p>Suivez votre activité et observez vos progrès au fil de vos entraînements.</p></div><div className="intro-medallion"><BarChart3 size={25} /></div></section>
    {error && <Notice kind="error">{error}</Notice>}
    {loading ? <Loading label="Calcul de votre progression…" /> : <>
      <div className="stats-grid progress-stats"><ProgressStat label="Activités enregistrées" value={String(rows.length)} icon={<Target size={18} />} /><ProgressStat label="Activités terminées" value={String(completed.length)} icon={<Award size={18} />} /><ProgressStat label="Temps de pratique" value={`${Math.round(totalMinutes)} min`} icon={<Clock3 size={18} />} /><ProgressStat label="Score moyen" value={average === null ? '—' : `${average}/100`} icon={<TrendingUp size={18} />} /></div>
      <div className="panel chart-panel"><div className="panel-heading"><div><span className="eyebrow">ÉVOLUTION</span><h3>Vos résultats</h3></div><span className="chart-legend"><i /> Score enregistré</span></div>{chartData.some(point => point.score !== null) ? <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}><defs><linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#D6A644" stopOpacity={0.24} /><stop offset="95%" stopColor="#D6A644" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#30313a" strokeDasharray="4 5" vertical={false} /><XAxis dataKey="date" tick={{ fill: '#888a94', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis domain={[0, 100]} tick={{ fill: '#888a94', fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: '#20212b', border: '1px solid #393a43', borderRadius: 12, color: '#fff' }} /><Area type="monotone" dataKey="score" stroke="#D6A644" strokeWidth={2.5} fill="url(#scoreFill)" connectNulls={false} /></AreaChart></ResponsiveContainer></div> : <EmptyPanel icon={<BarChart3 size={22} />} title="Votre courbe apparaîtra ici" text="Aucun score numérique exploitable n’a encore été enregistré dans user_progress. Les données réelles seront affichées dès vos premières activités suivies." />}</div>
      <div className="panel history-panel"><div className="panel-heading"><div><span className="eyebrow">VOTRE HISTORIQUE</span><h3>Activités récentes</h3></div></div>{rows.length ? <div className="history-list">{rows.slice(0, 10).map((row, index) => <div className="history-row" key={String(row.id || index)}><div className="history-mark"><Target size={16} /></div><div className="history-copy"><strong>{String(row.exercise_title || row.title || row.exercise_id || 'Activité')}</strong><span>{row.created_at ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(row.created_at)) : 'Date non renseignée'}</span></div><span className={`history-status ${row.completed === true || row.status === 'completed' || row.completed_at ? 'done' : ''}`}>{row.completed === true || row.status === 'completed' || row.completed_at ? 'Terminé' : String(row.status || 'En cours')}</span></div>)}</div> : <EmptyPanel icon={<Award size={22} />} title="Votre historique est vide" text="Vos activités apparaîtront ici lorsqu’elles seront enregistrées dans user_progress." />}</div>
    </>}
  </div>;
}

function ProgressStat({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div><strong>{value}</strong><small>Basé sur vos données enregistrées</small></div>;
}
