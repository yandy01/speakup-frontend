import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Flame, Mic, Timer, Zap } from "lucide-react";

export function DailyChallengeCard({ done = false }: { done?: boolean }) {
  return (
    <Link to="/challenge" className="pressable bg-gradient-challenge shimmer group relative block overflow-hidden rounded-3xl p-5 text-primary-foreground shadow-glow sm:p-7">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary-foreground/10" />
      <div className="absolute -bottom-16 right-16 h-32 w-32 rounded-full bg-primary-foreground/10 animate-float" />
      <div className="relative flex items-center gap-4 sm:gap-6">
        <div className="relative shrink-0">
          <span className="absolute inset-0 rounded-2xl bg-primary-foreground/40 animate-pulse-ring" />
          <span className="relative grid h-16 w-16 place-items-center rounded-2xl bg-primary-foreground text-accent-foreground shadow-lift sm:h-20 sm:w-20"><Zap className="h-8 w-8 animate-wiggle fill-accent text-accent sm:h-10 sm:w-10" /></span>
        </div>
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest">
            {done ? <><Check className="h-3 w-3" /> Relevé aujourd’hui</> : <><Flame className="h-3 w-3" /> Défi du jour · Nouveau</>}
          </span>
          <h3 className="mt-2 text-xl font-bold leading-tight sm:text-2xl">1 minute pour convaincre</h3>
          <p className="mt-1 hidden text-sm text-primary-foreground/85 sm:block">Un sujet surprise, 10 s pour réfléchir, 60 s pour briller. Votre jury IA vous note sur 100.</p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 whitespace-nowrap text-xs font-medium text-primary-foreground/90"><span className="flex items-center gap-1"><Timer className="h-3.5 w-3.5" /> 70 s</span><span className="flex items-center gap-1"><Mic className="h-3.5 w-3.5" /> Vocal</span><span>+60 XP max</span></div>
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-foreground text-primary-deep transition-transform group-hover:translate-x-1"><ArrowRight className="h-5 w-5" /></span>
      </div>
    </Link>
  );
}
