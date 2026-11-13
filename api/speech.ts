type HeaderValue = string | string[] | undefined;
type Req = { method?: string; headers: Record<string, HeaderValue>; body?: unknown };
type Res = { status(code: number): Res; setHeader(name: string, value: string): void; json(value: unknown): void; end(): void };
const env = (name: string) => ((globalThis as any).process?.env?.[name] || '').trim();
const header = (req: Req, name: string) => { const v = req.headers[name.toLowerCase()] ?? req.headers[name]; return Array.isArray(v) ? v[0] || '' : v || ''; };
const send = (res: Res, status: number, body: Record<string, unknown>) => res.status(status).json(body);
export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST, OPTIONS'); send(res, 405, { error: 'Méthode non autorisée.' }); return; }
  try {
    const token = header(req, 'authorization').match(/^Bearer\s+(.+)$/i)?.[1]?.trim(); if (!token) { send(res, 401, { error: 'Connectez-vous pour écouter la réponse du professeur.' }); return; }
    const url = env('SUPABASE_URL').replace(/\/$/, ''); const key = env('SUPABASE_PUBLISHABLE_KEY') || env('SUPABASE_ANON_KEY'); const geminiKey = env('GEMINI_API_KEY');
    if (!url || !key || !geminiKey) { send(res, 503, { error: 'La synthèse vocale n’est pas configurée.' }); return; }
    const auth = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` } }); if (!auth.ok) { send(res, 401, { error: 'Votre session a expiré.' }); return; }
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body as Record<string, unknown>;
    const text = typeof body?.text === 'string' ? body.text.trim().slice(0, 1800) : ''; const voice = body?.voice === 'Charon' ? 'Charon' : 'Achernar';
    if (!text) { send(res, 400, { error: 'Aucun texte à vocaliser.' }); return; }
    const primaryModel = env('GEMINI_SPEECH_MODEL') || 'gemini-3.8-flash-tts';
    const fallbackModel = env('GEMINI_SPEECH_FALLBACK_MODEL') || 'gemini-3.8-flash-lite-tts';
    const requestBody = (model: string) => JSON.stringify({
      model,
      input: [{ type: 'user_input', content: [{ type: 'text', text, annotations: [{ type: 'speech_metadata', style: 'Parle exclusivement en français standard francophone, avec une diction native, claire et fluide. Ne prononce pas les consignes. Lis exactement le texte fourni sans le traduire, sans ajouter de commentaire et sans transformer les noms propres. Utilise une prosodie chaleureuse, posée et professionnelle, avec un débit modéré et une articulation nette.' }] }] }],
      response_format: { type: 'audio' },
      generation_config: { speech_config: [{ voice }] },
    });
    const callModel = async (model: string) => fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: { 'x-goog-api-key': geminiKey, 'Content-Type': 'application/json' },
      body: requestBody(model),
      signal: AbortSignal.timeout(45_000),
    });
    let modelUsed = primaryModel;
    let response = await callModel(primaryModel);
    // Retry transient overload once, then use Gemini Flash-Lite TTS.
    if ([429, 500, 502, 503, 504].includes(response.status)) {
      await new Promise(resolve => setTimeout(resolve, 650));
      response = await callModel(primaryModel);
    }
    if (!response.ok && [429, 500, 502, 503, 504].includes(response.status) && fallbackModel !== primaryModel) {
      modelUsed = fallbackModel;
      response = await callModel(fallbackModel);
    }
    if (!response.ok) {
      const detail = await response.json().catch(() => null) as any;
      console.error('Eloqia TTS provider error', { status: response.status, model: modelUsed, provider: detail?.error?.status });
      const message = response.status === 503 || response.status === 429
        ? 'La voix du professeur est temporairement surchargée. La réponse écrite reste disponible ; réessaie dans un instant.'
        : `La synthèse vocale a échoué (${response.status}). Vérifie les modèles GEMINI_SPEECH_MODEL et GEMINI_SPEECH_FALLBACK_MODEL.`;
      send(res, response.status >= 500 || response.status === 429 ? 503 : response.status, { error: message });
      return;
    }
    const payload = await response.json() as any; const audio = payload?.output_audio?.data; const mime = payload?.output_audio?.mime_type || 'audio/wav';
    if (typeof audio !== 'string' || !audio.length) { send(res, 502, { error: 'Le service vocal n’a pas renvoyé de fichier audio.' }); return; }
    send(res, 200, { audio_base64: audio, mime_type: mime, voice, model: modelUsed, provider: 'gemini-tts' });
  } catch (error) { console.error('Eloqia speech generation error', { name: error instanceof Error ? error.name : 'unknown' }); send(res, 500, { error: 'Impossible de générer la voix du professeur pour le moment.' }); }
}
