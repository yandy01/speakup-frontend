import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, BookOpen, Clock3, Filter, Headphones, Languages, Search, Sparkles, Target } from 'lucide-react';
import { listExercises } from '../lib/data';
import type { Exercise } from '../lib/types';
import { Notice } from '../components/Notice';
import { Loading } from '../components/Loading';
import { EmptyPanel } from './DashboardPage';

export function ExercisesPage() {
  const [items, setItems] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState<Exercise | null>(null);

  useEffect(() => {
    let active = true;
    listExercises().then(rows => { if (active) setItems(rows); }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Impossible de charger les exercices.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const categories = useMemo(() => ['all', ...Array.from(new Set(items.map(item => String(item.category || 'Autre'))))], [items]);
  const filtered = items.filter(item => {
    const title = String(item.title || item.name || item.slug || '');
    const description = String(item.description || item.instructions || item.content || '');
    const matchesQuery = `${title} ${description}`.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = category === 'all' || String(item.category || 'Autre') === category;
    return matchesQuery && matchesCategory;
  });

  return <div className="page-stack">
    <section className="page-intro-row"><div><span className="eyebrow">APPRENDRE EN PRATIQUANT</span><h2>Bibliothèque d’exercices</h2><p>Des activités pour enrichir votre vocabulaire, travailler votre grammaire et gagner en aisance.</p></div><div className="intro-medallion"><BookOpen size={25} /></div></section>
    <div className="exercise-tools"><div className="search-field"><Search size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un exercice…" /></div><div className="filter-select"><Filter size={15} /><select value={category} onChange={e => setCategory(e.target.value)}><option value="all">Toutes les catégories</option>{categories.filter(c => c !== 'all').map(c => <option key={c} value={c}>{c}</option>)}</select></div></div>
    {error && <Notice kind="error">{error}</Notice>}
    {loading ? <Loading label="Chargement de la bibliothèque…" /> : filtered.length ? <div className="exercise-grid">{filtered.map((item, i) => <article className="exercise-card" key={item.id}><div className={`exercise-card-art art-${i % 4}`}><span className="exercise-art-icon">{item.language === 'en' ? <Languages size={25} /> : item.category?.toLowerCase().includes('écoute') ? <Headphones size={25} /> : <BookOpen size={25} />}</span><span className="exercise-type">{item.category || 'Exercice'}</span></div><div className="exercise-card-content"><div className="exercise-card-meta"><span>{item.language?.toUpperCase() || 'LANGUE'}</span><span><Clock3 size={13} /> {item.duration_minutes ? `${item.duration_minutes} min` : 'À votre rythme'}</span></div><h3>{item.title || item.name || item.slug || 'Exercice'}</h3><p>{item.description || item.instructions || 'Ouvrez cet exercice pour consulter les consignes.'}</p><div className="exercise-card-bottom"><span className="level-pill">{item.level || item.difficulty || 'Tous niveaux'}</span><button className="round-arrow" onClick={() => setSelected(item)} aria-label="Voir l'exercice"><ArrowUpRight size={17} /></button></div></div></article>)}</div> : <div className="panel"><EmptyPanel icon={<BookOpen size={23} />} title={items.length ? 'Aucun résultat' : 'Aucun exercice publié'} text={items.length ? 'Essayez une autre recherche ou une autre catégorie.' : 'Les exercices apparaîtront ici dès qu’ils seront ajoutés à la table exercises de votre projet Supabase. La bibliothèque n’utilise pas de faux contenus.'} /></div>}

    {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}><div className="detail-modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setSelected(null)}>×</button><span className="eyebrow">{selected.category || 'EXERCICE'}</span><h2>{selected.title || selected.name || selected.slug}</h2><p>{selected.description || selected.instructions || 'Consignes non renseignées.'}</p>{selected.content && <div className="exercise-detail-content">{String(selected.content)}</div>}<div className="detail-meta"><span><Target size={15} /> {selected.level || selected.difficulty || 'Tous niveaux'}</span><span><Clock3 size={15} /> {selected.duration_minutes ? `${selected.duration_minutes} minutes` : 'Durée libre'}</span></div><div className="notice notice-info"><Sparkles size={16} /><div>Le suivi de complétion sera activé lorsque le format et les règles de progression de la table user_progress auront été confirmés.</div></div></div></div>}
  </div>;
}
