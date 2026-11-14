import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PRACTICE_BANK } from "./exerciseBank";

export type Ex = { id: string; exercise_id: string; score: number; xp_earned: number; created_at: string };
export type Ch = { id: string; topic: string; duration_seconds: number; total_score: number; xp_earned: number; created_at: string };
export type Rd = { id: string; title: string; duration_seconds: number; total_score: number | null; xp_earned: number; created_at: string };

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
export function streakOf(dates: string[]) {
  const days = new Set(dates.map((v) => dayKey(new Date(v))));
  const c = new Date(); c.setHours(0, 0, 0, 0);
  if (!days.has(dayKey(c))) c.setDate(c.getDate() - 1);
  let n = 0; while (days.has(dayKey(c)) && n < 365) { n++; c.setDate(c.getDate() - 1); }
  return n;
}
/** XP rule: exercises count their best score / 2; challenges and readings add their stored xp. */
export function computeXp(ex: Pick<Ex, "exercise_id" | "score">[], others: { xp_earned: number }[]) {
  const best = new Map<string, number>();
  for (const a of ex) best.set(a.exercise_id, Math.max(best.get(a.exercise_id) ?? 0, a.score));
  return [...best.values()].reduce((s, v) => s + Math.round(v * 0.5), 0) + others.reduce((s, o) => s + Math.max(0, o.xp_earned || 0), 0);
}

export function useStats(userId?: string) {
  const [state, setState] = useState({ loading: true, ex: [] as Ex[], ch: [] as Ch[], rd: [] as Rd[] });
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    Promise.all([
      supabase.from("exercise_attempts").select("id,exercise_id,score,xp_earned,created_at").order("created_at", { ascending: false }).limit(500),
      supabase.from("speaking_challenge_attempts").select("id,topic,duration_seconds,total_score,xp_earned,created_at").order("created_at", { ascending: false }).limit(200),
      supabase.from("reading_attempts").select("id,title,duration_seconds,total_score,xp_earned,created_at").order("created_at", { ascending: false }).limit(200),
    ]).then(([a, b, c]) => { if (alive) setState({ loading: false, ex: (a.data ?? []) as Ex[], ch: (b.data ?? []) as Ch[], rd: (c.data ?? []) as Rd[] }); });
    return () => { alive = false; };
  }, [userId]);
  const best = new Map<string, number>();
  for (const a of state.ex) best.set(a.exercise_id, Math.max(best.get(a.exercise_id) ?? 0, a.score));
  const mastered = PRACTICE_BANK.filter((p) => (best.get(p.id) ?? 0) >= 80).length;
  const xp = computeXp(state.ex, [...state.ch, ...state.rd]);
  const streak = streakOf([...state.ex, ...state.ch, ...state.rd].map((r) => r.created_at));
  const todayDone = state.ch.some((c) => new Date(c.created_at).toDateString() === new Date().toDateString());
  return { ...state, best, mastered, xp, streak, todayDone };
}
