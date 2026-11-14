import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

export function Notice({ kind = "info", children }: { kind?: "info" | "error" | "success"; children: ReactNode }) {
  const styles = { info: "bg-primary-soft text-primary-deep", error: "bg-destructive/10 text-destructive", success: "bg-success/12 text-success" }[kind];
  const Icon = kind === "error" ? AlertCircle : kind === "success" ? CheckCircle2 : Info;
  return <div className={`animate-rise flex items-start gap-2.5 rounded-2xl px-4 py-3 text-sm ${styles}`}><Icon className="mt-0.5 h-4 w-4 shrink-0" /><div>{children}</div></div>;
}

export function Spinner({ label }: { label?: string }) {
  return <div className="flex items-center justify-center gap-3 py-8 text-sm text-muted-foreground"><span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />{label}</div>;
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${/\btext-(?!\[)/.test(className) ? "" : "text-primary"} ${className}`}>{children}</span>;
}

export function Bars({ count = 9, active = true, level, className = "" }: { count?: number; active?: boolean; level?: number; className?: string }) {
  return (
    <div className={`flex h-12 items-center justify-center gap-1 ${className}`} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <i key={i} className={`block w-1.5 rounded-full bg-current ${active && level === undefined ? "animate-wave" : ""}`}
          style={level !== undefined ? { height: `${Math.max(12, Math.min(100, (level * 100) * (0.5 + Math.sin(i * 1.7) * 0.5 + 0.4)))}%`, transition: "height 90ms linear" } : { height: "100%", animationDelay: `${(i % 5) * -0.15}s` }} />
      ))}
    </div>
  );
}

export function Confetti() {
  const colors = ["var(--accent)", "var(--primary)", "var(--success)", "var(--primary-deep)"];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden>
      {Array.from({ length: 28 }).map((_, i) => {
        const a = (i / 28) * Math.PI * 2;
        const d = 110 + (i % 4) * 40;
        return <i key={i} className="animate-confetti absolute left-1/2 top-1/2 h-2.5 w-1.5 rounded-sm"
          style={{ background: colors[i % 4], ["--dx" as string]: `${Math.cos(a) * d}px`, ["--dy" as string]: `${Math.sin(a) * d}px`, animationDelay: `${(i % 5) * 30}ms` }} />;
      })}
    </div>
  );
}

export function ScoreRing({ value, size = 140, label }: { value: number; size?: number; label?: string }) {
  const r = size / 2 - 10, c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--muted)" strokeWidth={10} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--primary)" strokeWidth={10} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)" }} />
      </svg>
      <div className="absolute text-center"><div className="text-4xl font-bold text-primary-deep">{value}</div>{label && <div className="text-xs text-muted-foreground">{label}</div>}</div>
    </div>
  );
}
