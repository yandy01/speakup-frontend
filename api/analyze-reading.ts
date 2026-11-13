/* ELOQIA — authenticated, transient audio analysis endpoint. Audio is not stored by this function. */
type HeaderValue = string | string[] | undefined;
type RequestLike = { method?: string; headers: Record<string, HeaderValue>; body?: unknown };
type ResponseLike = { status: (code: number) => ResponseLike; setHeader: (name: string, value: string) => void; json: (body: unknown) => void; end: () => void };
type Obj = Record<string, unknown>;

const runtimeEnv = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const MAX_AUDIO_BASE64 = 3_500_000;
const MAX_TEXT = 6_000;
const TIMEOUT_MS = 55_000;
const RATE_WINDOW_SECONDS = 60;
const RATE_MAX_REQUESTS = 8;

function env(name: string): string { return (runtimeEnv[name] ?? '').trim(); }
function header(req: RequestLike, name: string): string {
  const value = req.headers[name.toLowerCase()] ?? req.headers[name];
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}
function send(res: ResponseLike, status: number, payload: Obj): void { res.status(status).json(payload); }
function secureHeaders(res: ResponseLike): void {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Vary', 'Origin');
}
function checkOrigin(req: RequestLike, res: ResponseLike): boolean {
  const origin = header(req, 'origin');
  if (!origin) return true;
  const host = header(req, 'x-forwarded-host') || header(req, 'host');
  let sameOrigin = false;
  try { sameOrigin = Boolean(host) && new URL(origin).host.toLowerCase() === host.toLowerCase(); } catch { sameOrigin = false; }
  const allowed = env('ALLOWED_ORIGINS').split(',').map((value) => value.trim()).filter(Boolean);
  if (!sameOrigin && !allowed.includes(origin)) return false;
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Max-Age', '600');
  return true;
}
async function timedFetch(url: string, init: RequestInit, timeoutMs = TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, { ...init, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}
async function supabaseGet<T>(path: string, key: string, token: string, method = 'GET', body?: unknown): Promise<{ ok: boolean; status: number; data?: T }> {
  const base = env('SUPABASE_URL').replace(/\/$/, '');
  const response = await timedFetch(`${base}${path}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }, 9_000);
  if (!response.ok) return { ok: false, status: response.status };
  if (response.status === 204) return { ok: true, status: 204 };
  const data = await response.json().catch(() => null) as T;
  return { ok: true, status: response.status, data };
}
function cleanString(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max) : '';
}
function parseBody(body: unknown) {
  let parsed = body;
  if (typeof body === 'string') { try { parsed = JSON.parse(body); } catch { return null; } }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const value = parsed as Record<string, unknown>;
  const rawAudio = typeof value.audio_base64 === 'string' ? value.audio_base64.trim() : '';
  if (rawAudio.length > MAX_AUDIO_BASE64) return null;
  const audio = cleanString(rawAudio, MAX_AUDIO_BASE64);
  const rawMime = cleanString(value.mime_type, 100).split(';')[0].toLowerCase();
  const mime = rawMime === 'audio/x-m4a' ? 'audio/mp4' : rawMime;
  const target = cleanString(value.target_text, MAX_TEXT);
  const title = cleanString(value.exercise_title, 160) || 'Lecture guidée';
  const language = value.language === 'fr' ? 'fr' : null;
  const duration = Number(value.duration_seconds);
  const allowedMime = ['audio/webm', 'audio/mp4', 'audio/m4a', 'audio/ogg', 'audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/aac', 'audio/flac'];
  if (!audio || audio.length > MAX_AUDIO_BASE64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(audio)) return null;
  if (!allowedMime.includes(mime) || !target || !language || !Number.isFinite(duration) || duration < 2 || duration > 240) return null;
  return { audio, mime, target, title, language, duration };
}
function extractText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const value = payload as Obj;
  if (typeof value.output_text === 'string' && value.output_text.trim()) return value.output_text.trim();
  const steps = value.steps;
  if (Array.isArray(steps)) {
    return steps.filter((step) => step && typeof step === 'object' && (step as Obj).type === 'model_output')
      .flatMap((step) => Array.isArray((step as Obj).content) ? (step as Obj).content as unknown[] : [])
      .map((part) => part && typeof part === 'object' && typeof (part as Obj).text === 'string' ? String((part as Obj).text) : '')
      .join('\n').trim();
  }
  const candidates = value.candidates;
  if (!Array.isArray(candidates) || !candidates.length) return '';
  const content = (candidates[0] as Obj)?.content as Obj | undefined;
  const parts = content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map((part) => part && typeof part === 'object' && typeof (part as Obj).text === 'string' ? String((part as Obj).text) : '').join('\n').trim();
}
function parseFeedback(raw: string): Obj | null {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    const parsed = JSON.parse(trimmed) as Obj;
    const transcript = typeof parsed.transcript === 'string' ? parsed.transcript.trim() : '';
    const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : '';
    if (!transcript || !summary) return null;
    const list = (key: string) => Array.isArray(parsed[key]) ? (parsed[key] as unknown[]).filter((item): item is string => typeof item === 'string').slice(0, 6) : [];
    const rawScores = parsed.scores && typeof parsed.scores === 'object' ? parsed.scores as Obj : {};
    const score = (key: string): number | null => typeof rawScores[key] === 'number' && Number.isFinite(rawScores[key]) ? Math.max(0, Math.min(100, Math.round(rawScores[key] as number))) : null;
    const totalScore = typeof parsed.total_score === 'number' && Number.isFinite(parsed.total_score) ? Math.max(0, Math.min(100, Math.round(parsed.total_score))) : null;
    return {
      transcript: transcript.slice(0, 8_000),
      summary: summary.slice(0, 1_200),
      strengths: list('strengths'),
      improvements: list('improvements'),
      avoid: list('avoid'),
      scores: { reading_accuracy: score('reading_accuracy'), pacing: score('pacing'), articulation: score('articulation'), expression: score('expression') },
      total_score: totalScore,
      next_exercise: typeof parsed.next_exercise === 'string' ? parsed.next_exercise.slice(0, 700) : '',
      confidence_note: typeof parsed.confidence_note === 'string' ? parsed.confidence_note.slice(0, 500) : '',
    };
  } catch { return null; }
}

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  secureHeaders(res);
  if (!checkOrigin(req, res)) { send(res, 403, { error: 'Origine non autorisée.' }); return; }
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST, OPTIONS'); send(res, 405, { error: 'Méthode non autorisée.' }); return; }

  try {
    const contentLength = Number(header(req, 'content-length') || 0);
    if (contentLength > 4_300_000) { send(res, 413, { error: 'Enregistrement trop volumineux. Réduisez la durée de lecture.' }); return; }
    const bearer = header(req, 'authorization').match(/^Bearer\s+(.+)$/i);
    if (!bearer) { send(res, 401, { error: 'Connectez-vous pour analyser votre lecture.' }); return; }
    const supabaseUrl = env('SUPABASE_URL').replace(/\/$/, '');
    const key = env('SUPABASE_PUBLISHABLE_KEY') || env('SUPABASE_ANON_KEY');
    const geminiKey = env('GEMINI_API_KEY');
    const model = env('GEMINI_AUDIO_MODEL') || 'gemini-3.8-flash';
    const fallbackModel = env('GEMINI_AUDIO_FALLBACK_MODEL') || 'gemini-2.5-flash';
    if (!supabaseUrl || !key) { send(res, 503, { error: 'Le backend Supabase n’est pas configuré côté serveur.' }); return; }
    if (!geminiKey || !model) { send(res, 503, { error: 'Le moteur Gemini audio n’est pas configuré. Ajoutez GEMINI_API_KEY et GEMINI_AUDIO_MODEL dans les variables serveur.' }); return; }

    const input = parseBody(req.body);
    if (!input) { send(res, 400, { error: 'Données invalides. Vérifiez le format audio, la langue et la durée de l’enregistrement.' }); return; }

    const token = bearer[1].trim();
    const auth = await supabaseGet<{ id: string }>('/auth/v1/user', key, token);
    if (!auth.ok || !auth.data?.id) { send(res, 401, { error: 'Session invalide ou expirée. Reconnectez-vous.' }); return; }

    const quota = await supabaseGet<boolean>('/rest/v1/rpc/consume_ai_chat_quota', key, token, 'POST', {
      p_window_seconds: RATE_WINDOW_SECONDS,
      p_max_requests: RATE_MAX_REQUESTS,
    });
    if (!quota.ok) { send(res, 503, { error: 'La protection anti-abus Supabase est indisponible. Vérifiez la migration SQL déjà installée.' }); return; }
    if (quota.data !== true) { send(res, 429, { error: 'Limite temporaire atteinte. Attendez une minute avant une nouvelle analyse.' }); return; }

    const prompt = `Tu es le tuteur vocal d’ELOQIA, une école d’éloquence en français. Analyse réellement l'audio joint : l'utilisateur lit le texte cible ci-dessous. Retourne UNIQUEMENT un objet JSON valide, sans Markdown, avec exactement ces champs : transcript (transcription fidèle de ce qui est audible), summary (bilan encourageant mais honnête), strengths (2 à 5 points forts observables), improvements (2 à 5 améliorations concrètes), avoid (1 à 4 habitudes précises à éviter ou à surveiller, [] si aucune n'est clairement détectée), scores (reading_accuracy, pacing, articulation, expression : notes entières sur 100 ; utilise null si l'audio ne permet pas d'évaluer correctement ce critère), total_score (note entière sur 100), next_exercise (un exercice précis de 1 à 3 minutes), confidence_note (limites de l'analyse).

Barème du score total : fidélité au texte 35 %, rythme et pauses 25 %, articulation et intelligibilité 25 %, expressivité et intonation 15 %. Si un critère est null, redistribue proportionnellement son poids entre les critères réellement évaluables et explique cette limite. N'attribue jamais une note de prononciation à partir de la seule transcription. Ne pénalise pas un accent régional ou étranger lorsqu'il reste intelligible. Si la qualité audio est insuffisante, indique null pour les critères impossibles à mesurer et null pour total_score si moins de deux critères sont évaluables. Les notes doivent refléter des éléments réellement audibles, pas une impression générale.

Règles : distingue les faits observés des impressions. Si un mot est inaudible, indique [inaudible]. Compare avec le texte cible et signale les omissions, substitutions ou ajouts uniquement lorsqu'ils sont clairement identifiables. Le but est d'aider l'apprenant, pas de le décourager. Réponds en français exclusivement.

Titre : ${input.title}
Durée annoncée : ${input.duration} secondes
Texte cible :
${input.target}`;



    // Use the stable generateContent REST shape for inline audio. The previous
    // Interactions payload mixed snake_case content fields with generation_config.
    const models = [...new Set([model, fallbackModel].filter(Boolean))];
    let aiResponse: Response | null = null;
    let activeModel = model;
    let lastProviderStatus = 0;
    let lastProviderMessage = '';
    for (const candidate of models) {
      activeModel = candidate;
      const audioEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(candidate.replace(/^models\//, ''))}:generateContent`;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const response = await timedFetch(audioEndpoint, {
          method: 'POST',
          headers: { 'x-goog-api-key': geminiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [
              { text: prompt },
              { inlineData: { mimeType: input.mime, data: input.audio } },
            ] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 3_000, responseMimeType: 'application/json' },
          }),
        });
        if (response.ok) { aiResponse = response; break; }
        lastProviderStatus = response.status;
        const providerPayload = await response.json().catch(() => null) as { error?: { message?: string; status?: string } } | null;
        lastProviderMessage = cleanString(providerPayload?.error?.message, 450);
        console.warn('ELOQIA reading provider retry/fallback', { status: response.status, model: candidate, attempt });
        if (attempt === 0 && (response.status === 429 || response.status === 500 || response.status === 502 || response.status === 503 || response.status === 504)) {
          await new Promise(resolve => setTimeout(resolve, 700));
          continue;
        }
        break;
      }
      if (aiResponse) break;
    }
    if (!aiResponse) {
      const busy = lastProviderStatus === 429 || [500, 502, 503, 504].includes(lastProviderStatus);
      send(res, busy ? 503 : 502, {
        error: busy
          ? 'Le service d’analyse vocale est momentanément surchargé. Attends quelques instants et réessaie : ton enregistrement n’a pas été conservé.'
          : `Le moteur vocal a refusé l’analyse (${lastProviderStatus}). ${lastProviderMessage || 'Vérifie le modèle audio configuré dans Vercel.'}`,
        retryable: busy,
      });
      return;
    }
    const aiPayload = await aiResponse.json() as unknown;
    const raw = extractText(aiPayload);
    const feedback = parseFeedback(raw);
    if (!feedback) { send(res, 502, { error: 'Le tuteur a retourné un bilan illisible. Réessayez avec un enregistrement plus court et plus net.' }); return; }
    send(res, 200, { feedback, provider: 'gemini', model: activeModel, audioStored: false });
  } catch (error) {
    console.error('ELOQIA reading analysis failed', { name: error instanceof Error ? error.name : 'unknown' });
    send(res, 500, { error: 'Une erreur est survenue pendant l’analyse. Votre enregistrement n’a pas été conservé. Réessayez.' });
  }
}
