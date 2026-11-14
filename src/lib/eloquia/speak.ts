import { getAudio } from "./audio";

export type VoicePreset = "Achernar" | "Charon";
let currentObjectUrl: string | null = null;

/** Plays generated audio; a rejected playback lets the caller use the device TTS fallback. */
export async function playBase64(audio: string, mime: string, onEnd: () => void): Promise<void> {
  const binary = atob(audio);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);

  const url = URL.createObjectURL(new Blob([bytes], { type: mime || "audio/wav" }));
  const audioElement = getAudio();
  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
  currentObjectUrl = url;

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      audioElement.onended = null;
      audioElement.onerror = null;
      if (currentObjectUrl === url) currentObjectUrl = null;
      URL.revokeObjectURL(url);
    };
    audioElement.onended = () => {
      if (settled) return;
      settled = true;
      cleanup();
      onEnd();
      resolve();
    };
    audioElement.onerror = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("Le navigateur ne peut pas lire la réponse vocale."));
    };
    audioElement.src = url;
    audioElement.play().catch((error: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error instanceof Error ? error : new Error("Lecture audio impossible."));
    });
  });
}

export function speakWithDevice(text: string, preset: VoicePreset, onEnd: () => void): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.replace(/[*#`_]/g, " "));
  utterance.lang = "fr-FR";
  utterance.rate = 0.98;
  utterance.pitch = preset === "Achernar" ? 1.08 : 0.92;
  const frenchVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith("fr"));
  if (frenchVoice) utterance.voice = frenchVoice;
  utterance.onend = onEnd;
  utterance.onerror = onEnd;
  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopSpeaking(): void {
  const audioElement = getAudio();
  audioElement.pause();
  audioElement.currentTime = 0;
  audioElement.onended = null;
  audioElement.onerror = null;
  audioElement.removeAttribute("src");
  audioElement.load();
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}
