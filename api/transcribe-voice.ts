type HeaderValue = string | string[] | undefined;
type Req = { method?: string; headers: Record<string, HeaderValue>; body?: unknown };
type Res = { status(code: number): Res; setHeader(name: string, value: string): void; json(value: unknown): void; end(): void };
type Obj = Record<string, unknown>;
const env = (name: string) => ((globalThis as any).process?.env?.[name] || '').trim();
const header = (req: Req, name: string) => { const v = req.headers[name.toLowerCase()] ?? req.headers[name]; return Array.isArray(v) ? v[0] || '' : v || ''; };
const send = (res: Res, status: number, body: Obj) => res.status(status).json(body);
const timeoutFetch = async (url: string, init: RequestInit, ms = 35_000) => { const c = new AbortController(); const t = setTimeout(() => c.abort(), ms); try { return await fetch(url, { ...init, signal: c.signal }); } finally { clearTimeout(t); } };
function textFrom(data: any): string { const parts = data?.candidates?.[0]?.content?.parts; return Array.isArray(parts) ? parts.map((p: any) => typeof p?.text === 'string' ? p.text : '').join('\n').trim() : ''; }
async function quota(token: string, key: string, url: string) {
  const r = await timeoutFetch(`${url}/rest/v1/rpc/consume_ai_chat_quota`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_window_seconds: 60, p_max_requests: 12 }) }, 8000);
  return r.ok && await r.json() === true;
}
export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST, OPTIONS'); send(res, 405, { error: 'Méthode non autorisée.' }); return; }
  try {
    const authHeader = header(req, 'authorization'); const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
    if (!token) { send(res, 401, { error: 'Connectez-vous pour parler à votre professeur.' }); return; }
    const url = env('SUPABASE_URL').replace(/\/$/, ''); const key = env('SUPABASE_PUBLISHABLE_KEY') || env('SUPABASE_ANON_KEY'); const geminiKey = env('GEMINI_API_KEY');
    if (!url || !key || !geminiKey) { send(res, 503, { error: 'Le service vocal n’est pas entièrement configuré côté serveur.' }); return; }
    const auth = await timeoutFetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` } }, 8000);
    if (!auth.ok) { send(res, 401, { error: 'Votre session a expiré. Reconnectez-vous.' }); return; }
    if (!(await quota(token, key, url))) { send(res, 429, { error: 'Vous avez atteint la limite temporaire de messages vocaux. Réessayez dans une minute.' }); return; }
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body as Obj;
    const audio = typeof body?.audio_base64 === 'string' ? body.audio_base64 : '';
    const mime = typeof body?.mime_type === 'string' ? body.mime_type.split(';')[0] : 'audio/webm';
    if (!audio || audio.length > 5_400_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(audio) || !['audio/webm','audio/mp4','audio/m4a','audio/ogg','audio/wav','audio/mpeg','audio/mp3'].includes(mime)) { send(res, 400, { error: 'Format audio invalide ou enregistrement trop long.' }); return; }
    const preferred = env('GEMINI_AUDIO_MODEL') || 'gemini-3.8-flash';
    const models = [...new Set([preferred, 'gemini-2.5-flash'])];
    let lastStatus = 0; let transcript = '';
    for (const model of models) {
      for (let attempt = 0; attempt < 2; attempt++) {
        const response = await timeoutFetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model.replace(/^models\//,''))}:generateContent`, {
          method: 'POST', headers: { 'x-goog-api-key': geminiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Transcris fidèlement en français les paroles audibles. Conserve les hésitations et répétitions utiles. Ne traduis pas. Retourne uniquement la transcription, sans commentaire. Si aucun mot n’est intelligible, réponds exactement AUDIO_INAUDIBLE.' }, { inlineData: { mimeType: mime, data: audio } }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 1800 } }),
        });
        if (response.ok) { transcript = textFrom(await response.json()); if (transcript) break; }
        lastStatus = response.status;
        if (![429, 500, 502, 503, 504].includes(response.status)) break;
        if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 700));
      }
      if (transcript) break;
    }
    if (!transcript) { send(res, 502, { error: lastStatus === 503 || lastStatus === 429 ? 'Le service de reconnaissance vocale est momentanément saturé. Réessayez dans quelques instants.' : 'La transcription vocale a échoué. Réessayez dans un endroit plus calme.' }); return; }
    if (transcript === 'AUDIO_INAUDIBLE') { send(res, 422, { error: 'Je n’ai pas entendu de parole suffisamment claire. Vérifiez le microphone et réessayez.' }); return; }
    send(res, 200, { transcript, provider: 'gemini-audio' });
  } catch (error) { console.error('Eloqia voice transcription error', { name: error instanceof Error ? error.name : 'unknown' }); send(res, 500, { error: 'Une erreur est survenue pendant la transcription vocale.' }); }
}
