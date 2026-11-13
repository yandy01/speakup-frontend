import { useEffect, useMemo, useRef, useState } from 'react';
import { Award, BookOpen, Check, ChevronRight, Clock3, LockKeyhole, RotateCcw, Sparkles, Target, Trophy, Volume2, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PRACTICE_BANK, type PracticeExercise } from '../lib/exerciseBank';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

type Scores = Record<string, number>;
const storageKey = (userId?: string) => `eloqia-exercise-scores:${userId || 'guest'}`;

export function ExercisesPage() {
  const { user } = useAuth();
  const [scores, setScores] = useState<Scores>(() => { try { return JSON.parse(localStorage.getItem(storageKey(user?.id)) || '{}'); } catch { return {}; } });
  const [active, setActive] = useState<PracticeExercise | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [finishedScore, setFinishedScore] = useState<number | null>(null);
  const [earnedXp, setEarnedXp] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const autoAdvanceTimer = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    if (!user || !supabase) return;
    supabase.from('exercise_attempts').select('exercise_id,score').eq('user_id', user.id)
      .then(({ data, error }) => {
        if (!alive || error || !data) return;
        const merged: Scores = { ...scores };
        for (const row of data) merged[row.exercise_id] = Math.max(merged[row.exercise_id] ?? 0, Number(row.score) || 0);
        setScores(merged); localStorage.setItem(storageKey(user.id), JSON.stringify(merged));
      });
    return () => { alive = false; };
  }, [user?.id]);

  const completed = PRACTICE_BANK.filter(item => (scores[item.id] ?? 0) >= 80).length;
  const average = Object.values(scores).length ? Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length) : 0;
  const xp = Object.values(scores).reduce((sum, score) => sum + Math.round(score * 0.5), 0);
  const unlockedIndex = PRACTICE_BANK.findIndex(item => (scores[item.id] ?? 0) < 80);
  const currentIndex = unlockedIndex === -1 ? PRACTICE_BANK.length - 1 : unlockedIndex;

  function start(exercise: PracticeExercise) { if (autoAdvanceTimer.current) window.clearTimeout(autoAdvanceTimer.current); autoAdvanceTimer.current = null; setAutoAdvance(false); setActive(exercise); setQuestionIndex(0); setAnswers([]); setFinishedScore(null); setEarnedXp(0); setRevealed(false); }
  useEffect(() => () => { if (autoAdvanceTimer.current) window.clearTimeout(autoAdvanceTimer.current); }, []);

  function choose(index: number) { if (revealed) return; setAnswers(old => { const next = [...old]; next[questionIndex] = index; return next; }); setRevealed(true); }
  async function next() {
    if (!active) return;
    if (questionIndex < active.questions.length - 1) { setQuestionIndex(v => v + 1); setRevealed(false); return; }
    const correct = active.questions.reduce((sum, question, index) => sum + (answers[index] === question.answer ? 1 : 0), 0);
    const score = Math.round(correct / active.questions.length * 100);
    const previousBest = scores[active.id] ?? 0;
    const nextBest = Math.max(previousBest, score);
    const gainedXp = Math.max(0, Math.round(nextBest * .5) - Math.round(previousBest * .5));
    setEarnedXp(gainedXp);
    const nextScores = { ...scores, [active.id]: nextBest };
    setScores(nextScores); localStorage.setItem(storageKey(user?.id), JSON.stringify(nextScores)); setFinishedScore(score);
    const activeIndex = PRACTICE_BANK.findIndex(item => item.id === active.id);
    const automaticNext = score >= 80 ? PRACTICE_BANK[activeIndex + 1] : null;
    if (automaticNext) { setAutoAdvance(true); autoAdvanceTimer.current = window.setTimeout(() => start(automaticNext), 5000); }
    if (user && supabase) {
      setBusy(true);
      let { error } = await supabase.from('exercise_attempts').insert({ user_id: user.id, exercise_id: active.id, score, xp_earned: gainedXp });
      if (error && /xp_earned|column/i.test(error.message)) {
        // Backward-compatible until the additive XP migration has been applied.
        const fallback = await supabase.from('exercise_attempts').insert({ user_id: user.id, exercise_id: active.id, score });
        error = fallback.error;
      }
      setBusy(false);
      if (error) console.warn('Eloquia: impossible de synchroniser la tentative', error.message);
    }
  }
  function retry() { if (active) start(active); }
  const currentQuestion = active?.questions[questionIndex];
  const choiceOrder = currentQuestion ? currentQuestion.choices.map((_, index) => index).sort((a, b) => { const key = (index: number) => { let hash = 2166136261; const value = `${currentQuestion.prompt}|${currentQuestion.choices[index]}`; for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619); return hash >>> 0; }; return key(a) - key(b); }) : [];
  const passed = finishedScore !== null && finishedScore >= 80;
  const nextExercise = active ? PRACTICE_BANK[PRACTICE_BANK.findIndex(item => item.id === active.id) + 1] : null;

  return <div className="page-stack eloqia-path-page">
    <section className="journey-hero panel">
      <div className="journey-hero-copy"><span className="eyebrow">TON PARCOURS D’ORATEUR</span><h2>Chaque étape te rapproche d’une parole plus sûre.</h2><p>Entraîne-toi, maîtrise les bases et débloque les étapes suivantes. Le parcours s’adapte à ton niveau, mais les étapes restent dans le même ordre pour construire des fondations solides.</p></div>
      <div className="journey-xp-card"><span className="journey-xp-icon"><Trophy size={22}/></span><strong>{xp} XP</strong><span>points accumulés</span></div>
    </section>

    <section className="journey-summary panel">
      <div><span>ÉTAPES MAÎTRISÉES</span><strong>{completed}/{PRACTICE_BANK.length}</strong></div>
      <div className="journey-summary-track"><i style={{ width: `${completed / PRACTICE_BANK.length * 100}%` }}/></div>
      <div><span>MOYENNE</span><strong>{average}%</strong></div>
      <div><span>SEUIL DE VALIDATION</span><strong>80%</strong></div>
    </section>

    <section className="minute-challenge-card">
      <div className="challenge-card-symbol"><Zap size={28}/></div>
      <div className="challenge-card-copy"><span className="eyebrow">DÉFI DU JOUR</span><h3>Une minute pour convaincre</h3><p>Un sujet tiré au hasard, 10 secondes de préparation et 60 secondes pour défendre tes idées. Ton tuteur évalue ta prestation.</p></div>
      <Link to="/challenge" className="button button-gold">Lancer le défi <ChevronRight size={17}/></Link>
    </section>

    <div className="journey-section-heading"><div><span className="eyebrow">LE CHEMIN DE L’ÉLOQUENCE</span><h3>Débloque les étapes une à une</h3></div><span className="journey-current-pill"><Target size={14}/> Étape {Math.min(currentIndex + 1, PRACTICE_BANK.length)}</span></div>
    <div className="journey-path">
      {PRACTICE_BANK.map((item, index) => {
        const score = scores[item.id]; const isPassed = score !== undefined && score >= 80; const isUnlocked = index === 0 || (scores[PRACTICE_BANK[index - 1].id] ?? 0) >= 80; const isCurrent = isUnlocked && !isPassed;
        return <article className={`journey-step ${index % 2 ? 'journey-step-right' : 'journey-step-left'} ${isPassed ? 'is-passed' : ''} ${isCurrent ? 'is-current' : ''} ${!isUnlocked ? 'is-locked' : ''}`} key={item.id}>
          <div className="journey-step-node"><span>{isPassed ? <Check size={20}/> : !isUnlocked ? <LockKeyhole size={17}/> : index + 1}</span></div>
          <div className="journey-step-card panel">
            <div className="journey-step-top"><span className="journey-step-category">{item.category}</span><span className="journey-step-duration"><Clock3 size={13}/> {item.duration}</span></div>
            <h3>{item.title}</h3><p>{item.objective}</p>
            <div className="journey-step-bottom"><span className={`journey-step-status ${isPassed ? 'passed' : isCurrent ? 'current' : ''}`}>{isPassed ? `Maîtrisé · ${score}%` : isCurrent ? score !== undefined ? `À refaire · ${score}%` : 'À découvrir' : 'À débloquer'}</span>
              <button className="journey-step-button" disabled={!isUnlocked} onClick={() => start(item)} aria-label={`Ouvrir ${item.title}`}>{isPassed ? <RotateCcw size={17}/> : !isUnlocked ? <LockKeyhole size={16}/> : <ChevronRight size={19}/>}</button>
            </div>
            {isCurrent && <div className="journey-step-hint">Ton prochain objectif · 80 % pour valider</div>}
          </div>
        </article>;
      })}
    </div>

    {active && <div className="exercise-player-backdrop" role="dialog" aria-modal="true" aria-label={`Exercice ${active.title}`}><section className="exercise-player">
      <header className="exercise-player-header"><button className="exercise-close-link" onClick={() => setActive(null)}>Fermer</button><span className="eyebrow">ENTRAÎNEMENT GUIDÉ</span><span className="exercise-player-counter">{finishedScore === null ? `${questionIndex + 1} / ${active.questions.length}` : 'BILAN'}</span></header>
      {finishedScore === null ? <><div className="exercise-player-progress"><i style={{ width: `${(questionIndex + 1) / active.questions.length * 100}%` }}/></div><div className="exercise-player-body"><span className="gold-kicker"><Target size={15}/>{active.category} · {active.level}</span><h2>{active.title}</h2><p className="exercise-objective">{active.objective}</p><div className="exercise-question-card"><span className="eyebrow">QUESTION {questionIndex + 1}</span><h3>{currentQuestion?.prompt}</h3><div className="exercise-answer-list">{choiceOrder.map((originalIndex, displayIndex) => { const choice = currentQuestion!.choices[originalIndex]; const answer = originalIndex === currentQuestion!.answer; const selected = answers[questionIndex] === originalIndex; return <button key={`${currentQuestion!.prompt}-${originalIndex}`} className={`exercise-answer ${revealed && answer ? 'correct' : ''} ${revealed && selected && !answer ? 'incorrect' : ''} ${selected ? 'selected' : ''}`} onClick={() => choose(originalIndex)} disabled={revealed}><span>{String.fromCharCode(65 + displayIndex)}</span>{choice}{revealed && answer && <Check size={18}/>}</button>; })}</div>{revealed && <div className={`exercise-explanation ${answers[questionIndex] === currentQuestion?.answer ? 'good' : 'try-again'}`}><strong>{answers[questionIndex] === currentQuestion?.answer ? 'Bonne réponse !' : 'On apprend aussi de ses erreurs.'}</strong><p>{currentQuestion?.explanation}</p></div>}</div><button className="button button-primary exercise-next" onClick={() => void next()} disabled={!revealed || busy}>{busy ? 'Enregistrement…' : questionIndex === active.questions.length - 1 ? 'Voir mon résultat' : 'Question suivante'} <ChevronRight size={17}/></button></div></> : <div className="exercise-result"><div className={`exercise-result-medal ${passed ? 'passed' : ''}`}>{passed ? <Trophy size={34}/> : <Target size={34}/>}</div><span className="eyebrow">RÉSULTAT DE L’ÉTAPE</span><strong className="exercise-result-score">{finishedScore}%</strong><h2>{passed ? 'Étape maîtrisée !' : 'Encore un entraînement.'}</h2><p>{passed ? nextExercise ? 'Bravo. Le prochain niveau est débloqué et va s’ouvrir automatiquement.' : 'Tu as terminé tout le parcours. Tu peux refaire les étapes pour améliorer tes scores.' : 'Il faut obtenir au moins 80 % pour maîtriser cette étape. Revois les explications et recommence.'}</p><div className="exercise-result-xp"><Sparkles size={18}/> +{earnedXp} XP gagnés</div>
        {passed && nextExercise ? <><div className="exercise-auto-advance">{autoAdvance ? 'La prochaine étape démarre dans quelques secondes…' : 'Prochaine étape prête.'}</div><button className="button button-primary" onClick={() => start(nextExercise)}>Continuer maintenant <ChevronRight size={17}/></button><button className="exercise-close-link" onClick={() => { if (autoAdvanceTimer.current) window.clearTimeout(autoAdvanceTimer.current); setAutoAdvance(false); setActive(null); }}>Rester sur le chemin</button></> : <button className="button button-primary" onClick={() => passed ? setActive(null) : retry()}>{passed ? 'Revenir au chemin' : 'Recommencer'} <ChevronRight size={17}/></button>}
        <button className="exercise-close-link" onClick={() => setActive(null)}>Retour au parcours</button></div>}
    </section></div>}
  </div>;
}
