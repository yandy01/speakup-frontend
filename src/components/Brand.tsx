import { Link } from 'react-router-dom';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className={`brand ${compact ? 'brand-compact' : ''}`} aria-label="ELOQIA — accueil">
      <img src="/eloqia-mark.webp" alt="" className="brand-mark" />
      <span className="brand-wordmark">
        <strong>ELOQIA</strong>
      </span>
    </Link>
  );
}
