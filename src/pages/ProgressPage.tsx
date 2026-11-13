import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Award, BarChart3, Clock3, Flame, Mic, Target, TrendingUp, Trophy, Zap } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { listProgress } from '../lib/data';
import { supabase } from '../lib/supabase';
import type { ProgressEntry } from '../lib/types';
import { Loading } from '../components/Loading';
import { Notice } from '../components/Notice';
import { EmptyPanel } from './DashboardPage';

type ExerciseAttempt = { id:string; exercise_id:string; score:number; created_at:string };
type SpeakingAttempt = { id:string; topic:string; duration_seconds:number; total_score:number; xp_earned:number; created_at:string };
type ReadingAttempt = { id:string; text_id:string; title:string; duration_seconds:number; total_score:number|null; xp_earned:number; created_at:string };

export function ProgressPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<ProgressEntry[]>([]);
  const [exerciseAttempts, setExerciseAttempts] = useState<ExerciseAttempt[]>([]);
  const [speakingAttempts, setSpeakingAttempts] = useState<SpeakingAttempt[]>([]);
  const [readingAttempts, setReadingAttempts] = useState<ReadingAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    let active = true;
    Promise.all([
      listProgress(user.id).catch(() => { if (active) setError('Certaines anciennes activités n’ont pas pu être chargées.'); return []; }),
      supabase ? supabase.from('exercise_attempts').select('id,exercise_id,score,created_at').eq('user_id', user.id).order('created_at', {ascending:false}).then(({data,error}) => { if (error) { if (active) setError('Les résultats des exercices ne sont pas encore synchronisés.'); return []; } return data || []; }) : Promise.resolve([]),
      supabase ? supabase.from('speaking_challenge_attempts').select('id,topic,duration_seconds,total_score,xp_earned,created_at').eq('user_id', user.id).order('created_at', {ascending:false}).then(({data,error}) => { if (error) { if (active) setError('L’historique des défis nécessite sa migration Supabase.'); return []; } return data || []; }) : Promise.resolve([]),
      supabase ? supabase.from('reading_attempts').select('id,text_id,title,duration_seconds,total_score,xp_earned,created_at').eq('user_id', user.id).order('created_at', {ascending:false}).then(({data,error}) => { if (error) { if (active) setError('Exécute la migration reading_attempts pour afficher les notes de lecture.'); return []; } return data || []; }) : Promise.resolve([]),
    ]).then(([progressRows, quizRows, challengeRows, readingRows]) => {
      if (!active) return;
      setRows(progressRows);
      setExerciseAttempts(quizRows as ExerciseAttempt[]);
      setSpeakingAttempts(challengeRows as SpeakingAttempt[]);
      setReadingAttempts(readingRows as ReadingAttempt[]);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  const completed = rows.filter(row => row.completed === true || row.status === 'completed' || Boolean(row.completed_at)).length;
  const scoreValues = [
    ...rows.map(row => typeof row.score === 'number' ? row.score : null),
    ...exerciseAttempts.map(row => Number(row.score)),
    ...speakingAttempts.map(row => Number(row.total_score)),
    ...readingAttempts.map(row => row.total_score === null ? null : Number(row.total_score)),
  ].filter((value): value is number => value !== null && Number.isFinite(value));
  const average = scoreValues.length ? Math.round(scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length) : null;
  const bestExerciseScores = new Map<string, number>();
  for (const row of exerciseAttempts) bestExerciseScores.set(row.exercise_id, Math.max(bestExerciseScores.get(row.exercise_id) ?? 0, Number(row.score) || 0));
  const xp = [...bestExerciseScores.values()].reduce((sum, score) => sum + Math.round(Math.max(0, Math.min(100, score)) * .5), 0)
    + speakingAttempts.reduce((sum, row) => sum + (Number(row.xp_earned) || 0), 0)
    + readingAttempts.reduce((sum, row) => sum + (Number(row.xp_earned) || 0), 0);
  const totalMinutes = rows.reduce((sum, row) => sum + (typeof row.duration_minutes === 'number' ? row.duration_minutes : typeof row.duration_seconds === 'number' ? row.duration_seconds / 60 : 0), 0)
    + speakingAttempts.reduce((sum, row) => sum + (Number(row.duration_seconds) || 0) / 60, 0)
    + readingAttempts.reduce((sum, row) => sum + (Number(row.duration_seconds) || 0) / 60, 0);
  const chartData = useMemo(() => {
    const points = [
      ...rows.filter(row => row.created_at).map(row => ({ created_at: row.created_at!, score: typeof row.score === 'number' ? row.score : null })),
      ...exerciseAttempts.map(row => ({ created_at: row.created_at, score: Number(row.score) })),
      ...speakingAttempts.map(row => ({ created_at: row.created_at, score: Number(row.total_score) })),
      ...readingAttempts.filter(row => row.total_score !== null).map(row => ({ created_at: row.created_at, score: Number(row.total_score) })),
    ].filter(row => row.created_at && row.score !== null).sort((a,b) => new Date(a.created_at).getTime()-new Date(b.created_at).getTime());
    return points.map(row => ({ date: new Intl.DateTimeFormat('fr-FR', { day:'2-digit', month:'short' }).format(new Date(row.created_at)), score: row.score }));
  }, [rows, exerciseAttempts, speakingAttempts, readingAttempts]);
  const history = [
    ...exerciseAttempts.map(row => ({ id:row.id, title:row.exercise_id.replace(/-/g,' '), date:row.created_at, score:Number(row.score), kind:'Exercice' })),
    ...speakingAttempts.map(row => ({ id:row.id, title:row.topic, date:row.created_at, score:Number(row.total_score), kind:'Défi oral' })),
    ...readingAttempts.map(row => ({ id:row.id, title:row.title, date:row.created_at, score:row.total_score === null ? null : Number(row.total_score), kind:'Lecture' })),
    ...rows.map((row,index) => ({ id:String(row.id || `old-${index}`), title:String(row.exercise_title || row.title || row.exercise_id || 'Activité'), date:row.created_at || '', score:typeof row.score === 'number' ? row.score : null, kind:'Activité' })),
  ].sort((a,b) => new Date(b.date || 0).getTime()-new Date(a.date || 0).getTime()).slice(0,12);

  return <div className="page-stack eloqia-progress-page">
    <section className="page-intro-row"><div><span className="eyebrow">TON ÉVOLUTION</span><h2>Tu progresses, étape après étape.</h2><p>Retrouve tes scores, tes défis oratoires, ton temps d’entraînement et les compétences que tu développes.</p></div><div className="intro-medallion"><BarChart3 size={25}/></div></section>
    {error && <Notice kind="info">{error}</Notice>}
    {loading ? <Loading label="Calcul de ta progression…"/> : <>
      <section className="progress-xp-banner panel"><div className="progress-xp-medal"><Trophy size={25}/></div><div><span className="eyebrow">TES POINTS D’EXPÉRIENCE</span><strong>{xp.toLocaleString('fr-FR')} XP</strong><span>Gagnés grâce aux exercices et aux défis oratoires.</span></div><div className="progress-streak"><Flame size={20}/><strong>{speakingAttempts.length}</strong><small>défis réalisés</small></div></section>
      <div className="stats-grid progress-stats"><ProgressStat label="Activités suivies" value={String(rows.length + exerciseAttempts.length + speakingAttempts.length + readingAttempts.length)} icon={<Target size={18}/>} /><ProgressStat label="Étapes maîtrisées" value={String(bestExerciseScores.size ? [...bestExerciseScores.values()].filter(score => score >= 80).length : 0)} icon={<Award size={18}/>} /><ProgressStat label="Temps de pratique" value={`${Math.round(totalMinutes)} min`} icon={<Clock3 size={18}/>} /><ProgressStat label="Score moyen" value={average === null ? '—' : `${average}/100`} icon={<TrendingUp size={18}/>} /></div>
      <div className="progress-two-grid">
        <div className="panel chart-panel"><div className="panel-heading"><div><span className="eyebrow">TES RÉSULTATS</span><h3>Évolution des scores</h3></div><span className="chart-legend"><i/> Note /100</span></div>{chartData.length ? <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{top:12,right:8,left:-20,bottom:0}}><defs><linearGradient id="eloqiaScoreFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c49336" stopOpacity={.25}/><stop offset="95%" stopColor="#c49336" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="var(--line-strong)" strokeDasharray="4 5" vertical={false}/><XAxis dataKey="date" tick={{fill:'var(--muted)',fontSize:11}} axisLine={false} tickLine={false}/><YAxis domain={[0,100]} tick={{fill:'var(--muted)',fontSize:11}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:'var(--panel)',border:'1px solid var(--line-strong)',borderRadius:12,color:'var(--text)'}}/><Area type="monotone" dataKey="score" stroke="#b88736" strokeWidth={2.5} fill="url(#eloqiaScoreFill)"/></AreaChart></ResponsiveContainer></div> : <EmptyPanel icon={<BarChart3 size={22}/>} title="Ta courbe se construira ici" text="Termine un exercice ou un défi oral pour commencer à voir ton évolution."/>}</div>
        <div className="panel challenge-summary-panel"><div className="panel-heading"><div><span className="eyebrow">ENTRAÎNEMENT ORAL</span><h3>Tes défis minute</h3></div><Mic size={20}/></div><strong className="challenge-summary-score">{speakingAttempts.length ? `${Math.round(speakingAttempts.reduce((sum,row)=>sum+row.total_score,0)/speakingAttempts.length)}/100` : '—'}</strong><span className="challenge-summary-caption">Moyenne de tes défis enregistrés</span><div className="challenge-summary-list"><span><Zap size={14}/> {speakingAttempts.length} défis réalisés</span><span><Clock3 size={14}/> {Math.round(speakingAttempts.reduce((sum,row)=>sum+row.duration_seconds,0)/60)} min de parole enregistrée</span></div></div>
      </div>
      <div className="panel history-panel"><div className="panel-heading"><div><span className="eyebrow">TON HISTORIQUE</span><h3>Activités récentes</h3></div></div>{history.length ? <div className="history-list">{history.map(row=><div className="history-row" key={row.id}><div className="history-mark"><Target size={16}/></div><div className="history-copy"><strong>{row.title}</strong><span>{row.kind} · {row.date ? new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium'}).format(new Date(row.date)) : 'Date non renseignée'}</span></div><span className={`history-status ${row.score !== null && row.score >= 80 ? 'done' : ''}`}>{row.score === null ? 'Terminé' : `${row.score}/100`}</span></div>)}</div> : <EmptyPanel icon={<Award size={22}/>} title="Ton historique est vide" text="Tes exercices, lectures et défis apparaîtront ici au fur et à mesure."/>}</div>
    </>}
  </div>;
}

function ProgressStat({ label, value, icon }: { label:string; value:string; icon:ReactNode }) { return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div><strong>{value}</strong><small>Mis à jour à partir de ton activité</small></div>; }
