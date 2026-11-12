import type { Session } from '@supabase/supabase-js';

export interface ReadingFeedback {
  transcript: string;
  summary: string;
  strengths: string[];
  improvements: string[];
  avoid: string[];
  next_exercise: string;
  confidence_note: string;
}

function getEndpoint(): string {
  const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '') || '';
  if (!configuredBase) return '/api/analyze-reading';
  return configuredBase.endsWith('/api')
    ? `${configuredBase}/analyze-reading`
    : `${configuredBase}/api/analyze-reading`;
}

async function toBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const chunkSize = 0x8000;
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

export async function analyzeReading(input: {
  session: Session;
  audio: Blob;
  durationSeconds: number;
  targetText: string;
  title: string;
  language: 'fr' | 'en';
}): Promise<ReadingFeedback> {
  if (input.audio.size > 2_600_000) {
    throw new Error('L’enregistrement dépasse la limite de 2,6 Mo. Réduisez la vitesse de lecture ou choisissez un texte plus court.');
  }
  const audioBase64 = await toBase64(input.audio);
  const response = await fetch(getEndpoint(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${input.session.access_token}`,
    },
    body: JSON.stringify({
      audio_base64: audioBase64,
      mime_type: input.audio.type || 'audio/webm',
      duration_seconds: input.durationSeconds,
      target_text: input.targetText,
      exercise_title: input.title,
      language: input.language,
    }),
  });

  const payload = await response.json().catch(() => null) as { feedback?: ReadingFeedback; error?: string } | null;
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Le service de lecture IA est introuvable. Lancez le projet avec « npm run dev:full » et ouvrez http://localhost:3000.');
    }
    throw new Error(payload?.error || `L’analyse vocale a échoué (HTTP ${response.status}).`);
  }
  const feedback = payload?.feedback;
  if (!feedback || typeof feedback.transcript !== 'string' || !feedback.summary) {
    throw new Error('Le service IA a retourné un bilan incomplet. Réessayez avec un enregistrement plus net.');
  }
  return {
    transcript: feedback.transcript,
    summary: feedback.summary,
    strengths: Array.isArray(feedback.strengths) ? feedback.strengths.filter((v): v is string => typeof v === 'string') : [],
    improvements: Array.isArray(feedback.improvements) ? feedback.improvements.filter((v): v is string => typeof v === 'string') : [],
    avoid: Array.isArray(feedback.avoid) ? feedback.avoid.filter((v): v is string => typeof v === 'string') : [],
    next_exercise: typeof feedback.next_exercise === 'string' ? feedback.next_exercise : '',
    confidence_note: typeof feedback.confidence_note === 'string' ? feedback.confidence_note : '',
  };
}

export function estimateWordsPerMinute(transcript: string, durationSeconds: number): number | null {
  const words = transcript.trim().split(/\s+/).filter(Boolean).length;
  if (!words || durationSeconds < 1) return null;
  return Math.round((words / durationSeconds) * 60);
}

export function estimateReadingMatch(target: string, transcript: string): number | null {
  const normalize = (value: string) => value
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}' ]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const expected = normalize(target);
  const actual = normalize(transcript);
  if (!expected.length || !actual.length) return null;
  // Levenshtein distance over words; the result is an estimate, not a phonetic score.
  let previous = Array.from({ length: actual.length + 1 }, (_, index) => index);
  for (let row = 1; row <= expected.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= actual.length; column += 1) {
      const cost = expected[row - 1] === actual[column - 1] ? 0 : 1;
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + cost,
      );
    }
    previous = current;
  }
  return Math.max(0, Math.round((1 - previous[actual.length] / expected.length) * 100));
}
