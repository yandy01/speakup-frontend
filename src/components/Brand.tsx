import { Link } from 'react-router-dom';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className={`brand ${compact ? 'brand-compact' : ''}`} aria-label="SpeakUp AI — accueil">
      <img src="/speakup-mark.webp" alt="" className="brand-mark" />
      <span className="brand-wordmark">
        <strong>SPEAKUP</strong><small>AI</small>
      </span>
    </Link>
  );
}
