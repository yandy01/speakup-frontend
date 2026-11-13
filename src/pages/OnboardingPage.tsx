import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Mic2, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Brand } from '../components/Brand';

const GOALS = [
  'Prendre la parole avec confiance',
  'Améliorer ma diction et ma prononciation',
  'Structurer mes idées et mes discours',
  'Argumenter et convaincre',
  'Réussir mes présentations et mes exposés',
  'M’exprimer plus facilement au quotidien',
];
const DIFFICULTIES = [
  'Le trac et le manque de confiance', 'Les hésitations et les blancs',
  'L’articulation et la prononciation', 'Le manque de vocabulaire',
  'La structure des idées', 'Le débit et la respiration',
];
const LEVELS = [{ id: 'beginner', label: 'Débutant', detail: 'Je souhaite construire de bonnes bases.' }, { id: 'intermediate', label: 'Intermédiaire', detail: 'Je prends déjà la parole, mais je veux progresser.' }, { id: 'advanced', label: 'Avancé', detail: 'Je veux affiner ma maîtrise et mon impact.' }];
const DURATIONS = [5, 10, 15, 20];

export const onboardingStorageKey = (userId: string) => `eloqia-onboarding:${userId}`;

export function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [goals, setGoals] = useState<string[]>([]);
  const [level, setLevel] = useState('beginner');
  const [difficulties, setDifficulties] = useState<string[]>([]);
  const [minutes, setMinutes] = useState(10);
  const progress = useMemo(() => `${Math.round((step + 1) / 4 * 100)}%`, [step]);

  function toggle(value: string, values: string[], setter: (next: string[]) => void) {
    setter(values.includes(value) ? values.filter(item => item !== value) : [...values, value]);
  }
  function finish() {
    if (!user) return;
    const preferences = { goals, level, difficulties, daily_minutes: minutes, language: 'fr', completed_at: new Date().toISOString() };
    localStorage.setItem(onboardingStorageKey(user.id), JSON.stringify(preferences));
    navigate('/', { replace: true });
  }
  function skip() {
    if (!user) return;
    localStorage.setItem(onboardingStorageKey(user.id), JSON.stringify({ skipped: true, language: 'fr', completed_at: new Date().toISOString() }));
    navigate('/', { replace: true });
  }

  return <main className="onboarding-page">
    <div className="onboarding-top"><Brand /><button type="button" className="onboarding-skip" onClick={skip}>Plus tard</button></div>
    <section className="onboarding-card">
      <div className="onboarding-progress-head"><span>PERSONNALISATION · ÉTAPE {step + 1} SUR 4</span><strong>{progress}</strong></div>
      <div className="onboarding-progress-track"><i style={{ width: progress }} /></div>
      <div className="onboarding-content">
        {step === 0 && <><div className="onboarding-icon"><Target size={26} /></div><h1>Quel est votre objectif ?</h1><p>Choisissez les résultats que vous souhaitez obtenir avec Eloquia.</p><div className="onboarding-options">{GOALS.map(goal => <button key={goal} type="button" className={`onboarding-option ${goals.includes(goal) ? 'selected' : ''}`} onClick={() => toggle(goal, goals, setGoals)}><span>{goal}</span><i>{goals.includes(goal) ? <Check size={17} /> : null}</i></button>)}</div></>}
        {step === 1 && <><div className="onboarding-icon"><Mic2 size={26} /></div><h1>Où en êtes-vous aujourd’hui ?</h1><p>Il n’y a pas de mauvais niveau. Votre parcours sera progressif.</p><div className="onboarding-options">{LEVELS.map(item => <button key={item.id} type="button" className={`onboarding-option onboarding-level-option ${level === item.id ? 'selected' : ''}`} onClick={() => setLevel(item.id)}><span><strong>{item.label}</strong><small>{item.detail}</small></span><i>{level === item.id ? <Check size={17} /> : null}</i></button>)}</div></>}
        {step === 2 && <><div className="onboarding-icon"><Target size={26} /></div><h1>Que souhaitez-vous améliorer ?</h1><p>Sélectionnez les difficultés que vous rencontrez le plus souvent.</p><div className="onboarding-options">{DIFFICULTIES.map(item => <button key={item} type="button" className={`onboarding-option ${difficulties.includes(item) ? 'selected' : ''}`} onClick={() => toggle(item, difficulties, setDifficulties)}><span>{item}</span><i>{difficulties.includes(item) ? <Check size={17} /> : null}</i></button>)}</div></>}
        {step === 3 && <><div className="onboarding-icon"><Check size={26} /></div><h1>Votre rythme idéal ?</h1><p>Une courte séance régulière est déjà un excellent départ.</p><div className="onboarding-duration-grid">{DURATIONS.map(value => <button key={value} type="button" className={minutes === value ? 'selected' : ''} onClick={() => setMinutes(value)}><strong>{value}</strong><span>min / jour</span></button>)}</div><div className="onboarding-summary"><strong>Votre parcours de départ</strong><span>{goals.length || 'Objectifs libres'} objectif(s) · {LEVELS.find(item => item.id === level)?.label} · {difficulties.length || 'Aucune'} difficulté(s) ciblée(s) · {minutes} min par jour</span></div></>}
      </div>
      <div className="onboarding-actions"><button type="button" className="button button-secondary" onClick={() => setStep(value => Math.max(0, value - 1))} disabled={step === 0}><ArrowLeft size={17} /> Retour</button>{step < 3 ? <button type="button" className="button button-primary" onClick={() => setStep(value => Math.min(3, value + 1))}>Continuer <ArrowRight size={17} /></button> : <button type="button" className="button button-primary" onClick={finish}>Créer mon parcours <Check size={17} /></button>}</div>
    </section>
    <p className="onboarding-footnote">Vous pourrez modifier vos préférences à tout moment depuis votre profil.</p>
  </main>;
}
