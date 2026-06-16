import { useEffect, useState } from "react";

export type TTSStatus = "idle" | "playing" | "paused";

export function getVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  return window.speechSynthesis.getVoices();
}

export function useVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const update = () => setVoices(window.speechSynthesis.getVoices());
    update();
    window.speechSynthesis.onvoiceschanged = update;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);
  return voices;
}

export function speak(
  text: string,
  opts: { rate?: number; pitch?: number; voiceURI?: string | null } = {},
) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = opts.rate ?? 1;
  u.pitch = opts.pitch ?? 1;
  if (opts.voiceURI) {
    const v = window.speechSynthesis.getVoices().find((x) => x.voiceURI === opts.voiceURI);
    if (v) u.voice = v;
  }
  window.speechSynthesis.speak(u);
  return u;
}

export function pauseSpeech() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.pause();
}
export function resumeSpeech() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.resume();
}
export function stopSpeech() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}
