import { Link } from 'react-router-dom';
import { Mic2 } from 'lucide-react';

/** Temporary wordmark while the final Eloquia logo is being designed. */
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className={`brand eloqia-brand ${compact ? 'brand-compact' : ''}`} aria-label="Eloquia — accueil">
      <span className="eloqia-brand-symbol" aria-hidden="true"><Mic2 size={compact ? 18 : 22} strokeWidth={2.2} /></span>
      <span className="brand-wordmark"><strong>Eloquia</strong>{!compact && <small className="brand-tagline">L’art de mieux s’exprimer.</small>}</span>
    </Link>
  );
}
