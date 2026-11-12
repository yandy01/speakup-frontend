export function Loading({ label = 'Chargement…' }: { label?: string }) {
  return <div className="loading-state"><span className="spinner" /><span>{label}</span></div>;
}
