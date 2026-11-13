import type { Session } from '@supabase/supabase-js';

function api(path: string) {
  const base = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '') || '';
  const prefix = base ? (base.endsWith('/api') ? base : `${base}/api`) : '/api';
  return `${prefix}/${path.replace(/^\//, '')}`;
}

async function toBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  return btoa(binary);
}

export async function transcribeFrenchAudio(session: Session, audio: Blob): Promise<string> {
  if (!audio.size) throw new Error('Aucune voix détectée dans cet enregistrement.');
  if (audio.size > 4_000_000) throw new Error('L’enregistrement est trop volumineux. Faites une intervention plus courte.');
  const response = await fetch(api('transcribe-voice'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ audio_base64: await toBase64(audio), mime_type: audio.type.split(';')[0] || 'audio/webm' }),
  });
  const body = await response.json().catch(() => null) as { transcript?: string; error?: string } | null;
  if (!response.ok) throw new Error(body?.error || `La transcription a échoué (HTTP ${response.status}).`);
  if (!body?.transcript?.trim()) throw new Error('Je n’ai pas compris votre intervention. Rapprochez-vous du microphone et réessayez.');
  return body.transcript.trim();
}

export async function synthesizeFrenchSpeech(session: Session, text: string, voice: 'Achernar' | 'Charon'): Promise<Blob> {
  const response = await fetch(api('speech'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ text: text.slice(0, 1800), voice }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error || `La synthèse vocale a échoué (HTTP ${response.status}).`);
  }
  const body = await response.json() as { audio_base64?: string; mime_type?: string };
  if (!body.audio_base64) throw new Error('Le professeur n’a pas pu générer sa réponse vocale.');
  const binary = atob(body.audio_base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: body.mime_type || 'audio/wav' });
}

export function supportedRecorderMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
    .find(type => MediaRecorder.isTypeSupported(type));
}
