type HeaderValue = string | string[] | undefined;
type Req = { method?: string; headers: Record<string, HeaderValue>; body?: unknown };
type Res = { status(code: number): Res; setHeader(name: string, value: string): void; json(value: unknown): void; end(): void };
type Obj = Record<string, unknown>;
const env = (n: string) => ((globalThis as any).process?.env?.[n] || '').trim();
const head = (r: Req, n: string) => { const v = r.headers[n.toLowerCase()] ?? r.headers[n]; return Array.isArray(v) ? v[0] || '' : v || ''; };
const send = (r: Res, s: number, b: Obj) => r.status(s).json(b);
const fetchT = async (u: string, i: RequestInit, ms = 40_000) => { const c = new AbortController(); const t = setTimeout(() => c.abort(), ms); try { return await fetch(u, { ...i, signal: c.signal }); } finally { clearTimeout(t); } };
const getText = (p: any) => (p?.candidates?.[0]?.content?.parts || []).map((v: any) => typeof v?.text === 'string' ? v.text : '').join('\n').trim();
function parse(raw: string): Obj | null {
  try {
    const p = JSON.parse(raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')) as Obj;
    const transcript = typeof p.transcript === 'string' ? p.transcript.trim() : '';
    const summary = typeof p.summary === 'string' ? p.summary.trim() : '';
    const scores = p.scores as Obj;
    if (!transcript || !summary || !scores) return null;
    const clamp = (v: unknown) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
    const list = (k: string) => Array.isArray(p[k]) ? (p[k] as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, 5) : [];
    const normalized = { relevance: clamp(scores.relevance), structure: clamp(scores.structure), clarity: clamp(scores.clarity), fluency: clamp(scores.fluency) };
    return { transcript: transcript.slice(0, 7000), summary: summary.slice(0, 1200), scores: normalized, total_score: Math.round((normalized.relevance + normalized.structure + normalized.clarity + normalized.fluency) / 4), strengths: list('strengths'), improvements: list('improvements'), avoid: list('avoid'), next_exercise: typeof p.next_exercise === 'string' ? p.next_exercise.slice(0, 600) : '', confidence_note: typeof p.confidence_note === 'string' ? p.confidence_note.slice(0, 500) : '' };
  } catch { return null; }
}
export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST, OPTIONS'); send(res, 405, { error: 'Méthode non autorisée.' }); return; }
  try {
    const token = head(req, 'authorization').match(/^Bearer\s+(.+)$/i)?.[1]?.trim(); if (!token) { send(res, 401, { error: 'Connectez-vous pour enregistrer votre défi.' }); return; }
    const url = env('SUPABASE_URL').replace(/\/$/, ''); const key = env('SUPABASE_PUBLISHABLE_KEY') || env('SUPABASE_ANON_KEY'); const geminiKey = env('GEMINI_API_KEY');
    if (!url || !key || !geminiKey) { send(res, 503, { error: 'Le tuteur vocal n’est pas configuré côté serveur.' }); return; }
    const auth = await fetchT(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` } }, 8000); if (!auth.ok) { send(res, 401, { error: 'Votre session a expiré.' }); return; }
    const quota = await fetchT(`${url}/rest/v1/rpc/consume_ai_chat_quota`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_window_seconds: 60, p_max_requests: 8 }) }, 8000);
    if (!quota.ok || await quota.json() !== true) { send(res, 429, { error: 'Limite temporaire atteinte. Réessayez dans une minute.' }); return; }
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body as Obj;
    const audio = typeof body?.audio_base64 === 'string' ? body.audio_base64 : ''; const mime = typeof body?.mime_type === 'string' ? body.mime_type.split(';')[0] : 'audio/webm';
    const topic = typeof body?.topic === 'string' ? body.topic.trim().slice(0, 400) : ''; const duration = Math.round(Number(body?.duration_seconds));
    if (!audio || audio.length > 5_400_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(audio) || !topic || duration < 10 || duration > 90 || !['audio/webm','audio/mp4','audio/m4a','audio/ogg','audio/wav','audio/mpeg','audio/mp3'].includes(mime)) { send(res, 400, { error: 'Enregistrement ou sujet invalide. Le défi dure environ une minute.' }); return; }
    const prompt = `Tu es le jury pédagogique d’ELOQIA, école d’éloquence. Évalue réellement l’intervention orale jointe. Le sujet imposé était : « ${topic} ». Durée enregistrée : ${duration} secondes.
Retourne uniquement un JSON valide avec : transcript (transcription fidèle), summary (retour global franc et encourageant), scores (relevance, structure, clarity, fluency : entiers 0 à 100), strengths (2 à 4 points observables), improvements (2 à 4 conseils concrets), avoid (0 à 3 habitudes réellement repérées), next_exercise (un exercice court et précis), confidence_note (limites de l’analyse).
Grille : relevance = pertinence par rapport au sujet et respect de la consigne ; structure = introduction, développement et conclusion ou transitions ; clarity = intelligibilité et précision des idées ; fluency = continuité, débit et pauses à partir de ce qui est audible. Score total = moyenne des quatre dimensions. N’attribue pas de points pour un accent particulier ; ne pénalise pas l’accent régional. N’évalue pas la personnalité, la confiance intérieure ou les émotions. Ne fabrique aucune mesure. Si l’audio est trop court ou inaudible, indique cette limite et note avec prudence. Le but est de faire progresser l’orateur, pas de le flatter.`;
    const preferred = env('GEMINI_AUDIO_MODEL') || 'gemini-3.8-flash'; const models = [...new Set([preferred, 'gemini-2.5-flash'])]; let report: Obj | null = null; let lastStatus = 0;
    for (const model of models) {
      for (let attempt = 0; attempt < 2; attempt++) {
        const response = await fetchT(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model.replace(/^models\//,''))}:generateContent`, { method: 'POST', headers: { 'x-goog-api-key': geminiKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType: mime, data: audio } }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 2800, responseMimeType: 'application/json' } }) });
        if (response.ok) { const raw = getText(await response.json()); report = parse(raw); if (report) break; }
        else { lastStatus = response.status; if (![429, 500, 502, 503, 504].includes(response.status)) break; }
        if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 800));
      }
      if (report) break;
    }
    if (!report) { send(res, 502, { error: lastStatus === 503 || lastStatus === 429 ? 'Le service d’analyse est momentanément saturé. Réessayez dans quelques instants.' : 'Le tuteur n’a pas pu analyser cet enregistrement. Vérifiez le son et réessayez.' }); return; }
    send(res, 200, { feedback: report, provider: 'gemini-audio' });
  } catch (error) { console.error('Eloqia challenge analysis error', { name: error instanceof Error ? error.name : 'unknown' }); send(res, 500, { error: 'Une erreur est survenue pendant l’analyse du défi.' }); }
}
