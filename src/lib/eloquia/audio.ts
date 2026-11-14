export function recorderMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]) if (MediaRecorder.isTypeSupported?.(t)) return t;
  return "";
}
export async function blobToBase64(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
export function micErrorMessage(e: unknown) {
  const name = e instanceof Error ? e.name : "";
  if (name === "NotAllowedError") return "Accès au micro refusé. Autorisez le microphone dans les réglages du navigateur.";
  if (name === "NotFoundError") return "Aucun micro détecté sur cet appareil.";
  if (name === "NotReadableError") return "Le microphone est déjà utilisé par une autre application. Fermez-la puis réessayez.";
  if (name === "SecurityError") return "Le navigateur bloque l’accès au micro. Ouvrez ELOQIA en HTTPS et autorisez le microphone.";
  if (name === "OverconstrainedError") return "Les réglages audio demandés ne sont pas disponibles sur ce microphone.";
  return "Impossible d’ouvrir le micro. Vérifiez les autorisations du navigateur et qu’aucune autre application ne l’utilise.";
}

/** Single reusable audio element, unlocked during a user tap so mobile browsers allow later playback. */
let shared: HTMLAudioElement | null = null;
const SILENT = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";
export function getAudio() {
  if (!shared) { shared = new Audio(); shared.setAttribute("playsinline", "true"); }
  return shared;
}
export function unlockAudio() {
  const a = getAudio();
  if (a.dataset["unlocked"]) return;
  a.src = SILENT;
  a.play().then(() => { a.dataset["unlocked"] = "1"; }).catch(() => {});
}

export type Recording = { blob: Blob; mime: string; seconds: number };

/** Records a complete audio file and exposes a live input level (0..1). */
export class VoiceRecorder {
  private stream: MediaStream | null = null;
  private rec: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private started = 0;
  private ctx: AudioContext | null = null;
  private raf = 0;
  onLevel?: (v: number) => void;

  async open() {
    if (!window.isSecureContext && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
      throw new Error("Le microphone nécessite une connexion HTTPS. Ouvrez ELOQIA depuis son adresse sécurisée.");
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      throw new Error("Ce navigateur ne permet pas l’enregistrement. Utilisez Chrome ou Safari à jour.");
    }
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      void this.ctx.resume().catch(() => {});
      const src = this.ctx.createMediaStreamSource(this.stream);
      const an = this.ctx.createAnalyser(); an.fftSize = 512; src.connect(an);
      const buf = new Uint8Array(an.fftSize);
      const tick = () => {
        an.getByteTimeDomainData(buf);
        let sum = 0; for (const v of buf) { const x = (v - 128) / 128; sum += x * x; }
        this.onLevel?.(Math.min(1, Math.sqrt(sum / buf.length) * 4));
        this.raf = requestAnimationFrame(tick);
      };
      tick();
    } catch { /* level meter optional */ }
  }
  start() {
    if (!this.stream) throw new Error("Micro non ouvert.");
    const mime = recorderMime();
    this.rec = new MediaRecorder(this.stream, mime ? { mimeType: mime, audioBitsPerSecond: 48_000 } : undefined);
    this.chunks = [];
    this.rec.ondataavailable = (e) => { if (e.data.size) this.chunks.push(e.data); };
    this.rec.start(250);
    this.started = Date.now();
  }
  stop(): Promise<Recording> {
    return new Promise((resolve, reject) => {
      const rec = this.rec;
      if (!rec || rec.state === "inactive") { this.close(); reject(new Error("Aucun enregistrement en cours.")); return; }
      rec.onerror = () => {
        this.close();
        reject(new Error("Une erreur est survenue pendant l’enregistrement. Réessayez."));
      };
      rec.onstop = () => {
        const mime = ((rec.mimeType || this.chunks[0] && (this.chunks[0] as Blob).type || "audio/webm").split(";")[0] ?? "audio/webm").replace("video/", "audio/");
        const blob = new Blob(this.chunks, { type: mime });
        const seconds = (Date.now() - this.started) / 1000;
        this.close();
        if (!blob.size) { reject(new Error("Aucun son n’a été capturé. Vérifiez le microphone puis réessayez.")); return; }
        resolve({ blob, mime, seconds });
      };
      rec.stop();
    });
  }
  cancel() { try { if (this.rec && this.rec.state !== "inactive") { this.rec.onstop = null; this.rec.stop(); } } catch { /* */ } this.close(); }
  close() {
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null; this.rec = null;
    this.onLevel?.(0);
    this.ctx?.close().catch(() => {}); this.ctx = null;
  }
}
