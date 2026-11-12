import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import type { ReactNode } from 'react';

type Kind = 'info' | 'error' | 'success';
export function Notice({ kind = 'info', children }: { kind?: Kind; children: ReactNode }) {
  const Icon = kind === 'error' ? AlertCircle : kind === 'success' ? CheckCircle2 : Info;
  return <div className={`notice notice-${kind}`}><Icon size={17} /><div>{children}</div></div>;
}
