"use client";

// Plays Japanese audio. Pre-generated MP3 files (PRD section 9) are used when a `src` is given;
// until the audio run is done, the browser's own Japanese voice stands in so lessons still work.

export type PlayOptions = { text: string; src?: string | null; slow?: boolean; onEnd?: () => void; onError?: () => void };

let currentAudio: HTMLAudioElement | null = null;
let stopCurrent: (() => void) | null = null;

export function audioAvailable(): boolean {
  return typeof window !== "undefined" && ("speechSynthesis" in window || typeof Audio !== "undefined");
}

export function stopAudio() {
  stopCurrent?.();
  stopCurrent = null;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

/** Starts playback and returns a function that stops it. Anything already playing is stopped first. */
export function playJapanese({ text, src, slow, onEnd, onError }: PlayOptions): () => void {
  stopAudio();
  let finished = false;
  const done = () => {
    if (finished) return;
    finished = true;
    onEnd?.();
  };

  if (src) {
    const audio = new Audio(src);
    currentAudio = audio;
    audio.onended = done;
    audio.onerror = () => {
      finished = true;
      onError?.();
    };
    audio.play().catch(() => {
      finished = true;
      onError?.();
    });
    stopCurrent = () => {
      audio.pause();
      done();
    };
    return stopCurrent;
  }

  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onError?.();
    return () => {};
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ja-JP";
  utterance.rate = slow ? 0.55 : 0.9;
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith("ja"));
  if (voice) utterance.voice = voice;
  utterance.onend = done;
  utterance.onerror = (event) => {
    // "canceled" and "interrupted" happen when we stop on purpose.
    if (event.error === "canceled" || event.error === "interrupted") return done();
    finished = true;
    onError?.();
  };
  window.speechSynthesis.speak(utterance);
  stopCurrent = () => {
    window.speechSynthesis.cancel();
    done();
  };
  return stopCurrent;
}
