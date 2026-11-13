import type { Session } from '@supabase/supabase-js';

const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '') || '';
const chatEndpoint = configuredBase
  ? (configuredBase.endsWith('/api') ? `${configuredBase}/chat` : `${configuredBase}/api/chat`)
  : '/api/chat';

export const isAiBackendConfigured = Boolean(configuredBase);

export async function askSpeakUpCoach(
  session: Session,
  conversationId: string,
  message: string,
  language: 'fr' = 'fr',
): Promise<string> {
  const response = await fetch(chatEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      conversation_id: conversationId,
      message,
      language,
    }),
  });
  const payload = await response.json().catch(() => null) as { reply?: string; error?: string } | null;
  if (!response.ok) throw new Error(payload?.error || `Le service IA a répondu avec le statut ${response.status}.`);
  if (!payload?.reply?.trim()) throw new Error('Le service IA a répondu sans contenu exploitable.');
  return payload.reply.trim();
}
