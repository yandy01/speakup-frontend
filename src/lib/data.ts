import type { AppProfile, Conversation, Exercise, ProgressEntry } from './types';
import { supabase } from './supabase';

function requireClient() {
  if (!supabase) throw new Error('Supabase n’est pas configuré. Consulte le fichier README.');
  return supabase;
}

export async function getProfile(userId: string): Promise<AppProfile | null> {
  const client = requireClient();
  const { data, error } = await client.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data as AppProfile | null;
}

export async function updateProfile(userId: string, current: AppProfile | null, updates: Record<string, unknown>) {
  const client = requireClient();
  // Never invent column names: only submit fields already returned by SELECT *.
  const allowed = new Set(Object.keys(current ?? { id: userId, display_name: null }));
  const safeUpdates = Object.fromEntries(Object.entries(updates).filter(([key]) => allowed.has(key) && key !== 'id'));
  if (!Object.keys(safeUpdates).length) throw new Error('Aucun champ modifiable correspondant au schéma actuel de profiles.');
  const { data, error } = await client.from('profiles').update(safeUpdates).eq('id', userId).select('*').single();
  if (error) throw error;
  return data as AppProfile;
}

export async function listConversations(userId: string): Promise<Conversation[]> {
  const client = requireClient();
  const { data, error } = await client.from('conversations').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Conversation[];
}

export async function createConversation(userId: string, title: string, language: string): Promise<Conversation> {
  const client = requireClient();
  // user_id is the required ownership column confirmed in the project recap.
  const { data, error } = await client.from('conversations').insert({ user_id: userId }).select('*').single();
  if (error) throw error;
  const conversation = data as Conversation;
  const patch: Record<string, unknown> = {};
  if (Object.prototype.hasOwnProperty.call(conversation, 'title')) patch.title = title;
  if (Object.prototype.hasOwnProperty.call(conversation, 'language')) patch.language = language;
  if (Object.keys(patch).length) {
    const { data: updated, error: updateError } = await client.from('conversations').update(patch).eq('id', conversation.id).eq('user_id', userId).select('*').single();
    if (!updateError && updated) return updated as Conversation;
  }
  return conversation;
}

export async function listMessages(conversationId: string, userId: string) {
  const client = requireClient();
  const { data, error } = await client.from('messages').select('*').eq('conversation_id', conversationId).eq('user_id', userId).order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Array<Record<string, unknown>>;
}

export async function saveMessage(input: {
  conversationId: string; userId: string; role: 'user' | 'assistant'; content: string;
}) {
  const client = requireClient();
  const { data, error } = await client.from('messages').insert({
    conversation_id: input.conversationId,
    user_id: input.userId,
    role: input.role,
    content: input.content,
  }).select('*').single();
  if (error) throw error;
  return data;
}

export async function listExercises(): Promise<Exercise[]> {
  const client = requireClient();
  const { data, error } = await client.from('exercises').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Exercise[];
}

export async function listProgress(userId: string): Promise<ProgressEntry[]> {
  const client = requireClient();
  const { data, error } = await client.from('user_progress').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ProgressEntry[];
}

export async function countRows(table: 'conversations' | 'messages' | 'exercises' | 'user_progress', userId?: string) {
  const client = requireClient();
  let query = client.from(table).select('*', { count: 'exact', head: true });
  if (userId && table !== 'exercises') query = query.eq('user_id', userId);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}
