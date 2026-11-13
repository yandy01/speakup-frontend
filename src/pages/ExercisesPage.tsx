import { useEffect, useMemo, useState } from 'react';
import { Award, BookOpen, Check, ChevronLeft, ChevronRight, Clock3, LockKeyhole, RotateCcw, Search, Sparkles, Target, Trophy, X } from 'lucide-react';
import { PRACTICE_BANK, type PracticeExercise } from '../lib/exerciseBank';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

type Scores = Record<string, number>;
const storageKey = (userId?: string) => `speakup-exercise-scores:${userId || 'guest'}`;

export function ExercisesPage() {
  const { user } = useAuth();
  const [scores, setScores] = useState<Scores>(() => { try { return JSON.parse(localStorage.getItem(storageKey(user?.id)) || '{}'); } catch { return {}; } });
  useEffect(() => { let active = true; if (!user || !supabase) return; supabase.from('exercise_attempts').select('exercise_id,score').eq('user_id', user.id).then(({data,error}) => { if (!active || error || !data) return; const merged: Scores = {...scores}; for (const row of data) merged[row.exercise_id] = Math.max(merged[row.exercise_id] ?? 0, Number(row.score) || 0); setScores(merged); localStorage.setItem(storageKey(user.id), JSON.stringify(merged)); }); return () => { active = false; }; }, [user?.id]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Toutes');
  const [active, setActive] = useState<PracticeExercise | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [finishedScore, setFinishedScore] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const categories = useMemo(() => ['Toutes', ...Array.from(new Set(PRACTICE_BANK.map(item => item.category)))], []);
  const filtered = PRACTICE_BANK.filter((item, index) => {
    const unlocked = index === 0 || (scores[PRACTICE_BANK[index - 1].id] ?? 0) >= 80;
    return unlocked && (category === 'Toutes' || item.category === category) && `${item.title} ${item.objective} ${item.level}`.toLowerCase().includes(query.toLowerCase());
  });
  const attempted = PRACTICE_BANK.filter(item => scores[item.id] !== undefined);
  const completed = attempted.filter(item => scores[item.id] >= 80).length;
  const average = attempted.length ? Math.round(attempted.reduce((sum, item) => sum + scores[item.id], 0) / attempted.length) : 0;
  const earnedXp = attempted.reduce((sum, item) => sum + scores[item.id], 0);

  function start(exercise: PracticeExercise) { setActive(exercise); setQuestionIndex(0); setAnswers([]); setFinishedScore(null); setRevealed(false); }
  function choose(index: number) { if (revealed) return; setAnswers(old => { const next = [...old]; next[questionIndex] = index; return next; }); setRevealed(true); }
  function next() {
    if (!active) return;
    if (questionIndex < active.questions.length - 1) { setQuestionIndex(value => value + 1); setRevealed(false); return; }
    const correct = active.questions.reduce((sum, question, index) => sum + (answers[index] === question.answer ? 1 : 0), 0);
    const score = Math.round(correct / active.questions.length * 100);
    const nextScores = { ...scores, [active.id]: Math.max(scores[active.id] ?? 0, score) };
    setScores(nextScores); localStorage.setItem(storageKey(user?.id), JSON.stringify(nextScores)); if (user && supabase) void supabase.from('exercise_attempts').insert({user_id:user.id, exercise_id:active.id, score}); setFinishedScore(score);
  }
  function retry() { if (active) start(active); }

  return <div className="page-stack exercises-v2">
    <section className="exercise-hero panel"><div><span className="eyebrow">APPRENDRE · PRATIQUER · MAÎTRISER</span><h2>Ta salle d'entraînement</h2><p>Des parcours progressifs pour construire des compétences solides, exercice après exercice.</p></div><div className="exercise-xp"><Trophy size={22}/><strong>{earnedXp} XP</strong><span>points gagnés</span></div></section>
    <section className="exercise-progress-strip panel"><div><span className="exercise-progress-label">PARCOURS MAÎTRISÉS</span><strong>{completed} / {PRACTICE_BANK.length}</strong></div><div className="exercise-progress-bar"><i style={{width:`${completed / PRACTICE_BANK.length * 100}%`}}/></div><div><span className="exercise-progress-label">MOYENNE DES MEILLEURS SCORES</span><strong>{average}%</strong></div></section>
    <div className="exercise-tools exercise-tools-v2"><div className="search-field"><Search size={18}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Rechercher un parcours…"/></div><div className="filter-select"><select value={category} onChange={event => setCategory(event.target.value)} aria-label="Filtrer par catégorie">{categories.map(item => <option key={item}>{item}</option>)}</select></div></div>
    <div className="exercise-grid exercise-grid-v2">{filtered.map((item) => {
      const index = PRACTICE_BANK.findIndex(row => row.id === item.id);
      const score = scores[item.id];
      const passed = score !== undefined && score >= 80;
      return <article className="exercise-card exercise-card-v2" key={item.id}><div className={`exercise-card-art art-${index % 4}`}><span className="exercise-art-icon"><BookOpen size={26}/></span><span className="exercise-type">{item.category}</span><span className="exercise-sequence">ÉTAPE {String(index + 1).padStart(2,'0')}</span></div><div className="exercise-card-content"><div className="exercise-card-meta"><span>{item.level}</span><span><Clock3 size={14}/> {item.duration}</span></div><h3>{item.title}</h3><p>{item.objective}</p><div className="exercise-card-bottom"><span className={`level-pill ${passed ? 'passed' : ''}`}>{passed ? `Maîtrisé · ${score}%` : score !== undefined ? `À refaire · ${score}%` : '5 questions · jusqu’à 100 XP'}</span><button className="round-arrow" onClick={() => start(item)} aria-label={`Commencer ${item.title}`}>{passed ? <Check size={18}/> : <ChevronRight size={19}/>}</button></div></div></article>;
    })}</div>
    {filtered.length === 0 && <div className="panel empty-exercises"><LockKeyhole size={24}/><strong>Aucun parcours disponible avec ces filtres.</strong><span>Termine le parcours précédent avec au moins 80 % pour débloquer la suite.</span></div>}
    <div className="exercise-unlock-note"><LockKeyhole size={16}/><span>Règle de progression : obtiens au moins <strong>80 %</strong> pour valider un parcours et débloquer le suivant. Tu peux recommencer autant de fois que nécessaire. Ton meilleur score est synchronisé avec ton compte si la migration Supabase est installée.</span></div>

    {active && <div className="modal-backdrop exercise-player-backdrop" onClick={() => setActive(null)}><section className="exercise-player" onClick={event => event.stopPropagation()}><header className="exercise-player-header"><button className="tool-button" onClick={() => setActive(null)}><X size={18}/><span>Quitter</span></button><span className="eyebrow">ENTRAÎNEMENT GUIDÉ</span><span className="exercise-player-counter">{finishedScore === null ? `${questionIndex + 1} / ${active.questions.length}` : 'BILAN'}</span></header>
      {finishedScore === null ? <><div className="exercise-player-progress"><i style={{width:`${(questionIndex + 1) / active.questions.length * 100}%`}}/></div><div className="exercise-player-body"><span className="gold-kicker"><Target size={15}/>{active.category} · {active.level}</span><h2>{active.title}</h2><p className="exercise-objective">{active.objective}</p><div className="exercise-question-card"><span className="eyebrow">QUESTION {questionIndex + 1}</span><h3>{active.questions[questionIndex].prompt}</h3><div className="exercise-answer-list">{active.questions[questionIndex].choices.map((choice, index) => { const isAnswer = index === active.questions[questionIndex].answer; const isSelected = answers[questionIndex] === index; return <button key={choice} className={`exercise-answer ${revealed && isAnswer ? 'correct' : ''} ${revealed && isSelected && !isAnswer ? 'incorrect' : ''} ${isSelected ? 'selected' : ''}`} onClick={() => choose(index)} disabled={revealed}><span>{String.fromCharCode(65 + index)}</span>{choice}{revealed && isAnswer && <Check size={18}/>} {revealed && isSelected && !isAnswer && <X size={18}/>}</button>;})}</div>{revealed && <div className={`exercise-explanation ${answers[questionIndex] === active.questions[questionIndex].answer ? 'good' : 'try-again'}`}><strong>{answers[questionIndex] === active.questions[questionIndex].answer ? 'Bonne réponse !' : 'Pas tout à fait.'}</strong><p>{active.questions[questionIndex].explanation}</p></div>}</div><button className="button button-primary exercise-next" disabled={!revealed} onClick={next}>{questionIndex === active.questions.length - 1 ? 'Voir mon résultat' : 'Question suivante'} <ChevronRight size={17}/></button></div></> : <div className="exercise-result"><div className={`exercise-result-medal ${finishedScore >= 80 ? 'passed' : ''}`}>{finishedScore >= 80 ? <Trophy size={34}/> : <Target size={34}/>}</div><span className="eyebrow">RÉSULTAT DU PARCOURS</span><strong className="exercise-result-score">{finishedScore}%</strong><h2>{finishedScore >= 80 ? 'Parcours validé !' : 'Encore un petit effort.'}</h2><p>{finishedScore >= 80 ? 'Tu as atteint le seuil de maîtrise. Le prochain parcours est maintenant accessible.' : 'Il faut atteindre 80 % pour valider ce parcours. Relis les explications et retente le quiz.'}</p><div className="exercise-result-xp"><Sparkles size={18}/> +{finishedScore} XP gagnés</div><button className="button button-primary" onClick={() => finishedScore >= 80 ? setActive(null) : retry()}>{finishedScore >= 80 ? 'Continuer' : 'Recommencer'} <ChevronRight size={17}/></button><button className="exercise-close-link" onClick={() => setActive(null)}>Retour aux parcours</button></div>}</section></div>}
  </div>;
}
