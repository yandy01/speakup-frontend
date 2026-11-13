import type { ReactNode } from 'react';

interface EmptyPanelProps {
  icon: ReactNode;
  title: string;
  text: string;
}

export function EmptyPanel({ icon, title, text }: EmptyPanelProps) {
  return (
    <div className="empty-panel" role="status">
      <span className="empty-panel-icon" aria-hidden="true">{icon}</span>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}
