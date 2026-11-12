export type JsonRecord = Record<string, unknown>;

export interface AppProfile extends JsonRecord {
  id: string;
  display_name?: string | null;
  email?: string | null;
  preferred_language?: string | null;
  native_language?: string | null;
  target_language?: string | null;
  level?: string | null;
}

export interface Conversation extends JsonRecord {
  id: string;
  user_id: string;
  title?: string | null;
  language?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ChatMessage extends JsonRecord {
  id?: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at?: string;
}

export interface Exercise extends JsonRecord {
  id: string;
  slug?: string;
  title?: string;
  name?: string;
  description?: string;
  content?: string;
  instructions?: string;
  category?: string;
  level?: string;
  difficulty?: string;
  language?: string;
  duration_minutes?: number;
  created_at?: string;
}

export interface ProgressEntry extends JsonRecord {
  id?: string;
  user_id: string;
  exercise_id?: string;
  score?: number;
  completed?: boolean;
  status?: string;
  created_at?: string;
  completed_at?: string;
}

export function valueAsString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

export function valueAsNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function formatDate(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date);
}
