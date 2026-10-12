"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Microphone, Play, Stop } from "@phosphor-icons/react";
import { PlayButton } from "@/components/app/PlayButton";
import { stopAudio } from "@/lib/speech";

type Props = {
  item: { id: number; kana: string; romaji: string; english: string };
  showRomaji: boolean;
  onDone: () => void;
};

const MAX_SECONDS = 5;
const STEPS = ["Listen", "Record", "Compare"] as const;

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  // Chrome and Firefox record WebM/Opus; Safari records MP4/AAC.
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"].find((t) => MediaRecorder.isTypeSupported(t));
}

/** Listen, record up to 5 seconds, then hear the model and your own voice back to back. Nothing is scored or uploaded. */
export function SayIt({ item, showRomaji, onDone }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clip, setClip] = useState<{ url: string; seconds: number } | null>(null);
  const [clipPlaying, setClipPlaying] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAtRef = useRef(0);
  const meterRef = useRef<HTMLDivElement>(null);
  const meterCleanupRef = useRef<(() => void) | null>(null);
  const clipAudioRef = useRef<HTMLAudioElement | null>(null);
  const reportedRef = useRef(false);

  const releaseMic = useCallback(() => {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    meterCleanupRef.current?.();
    meterCleanupRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(
    () => () => {
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      releaseMic();
      clipAudioRef.current?.pause();
      stopAudio();
    },
    [releaseMic],
  );

  // Revoke the old recording's URL whenever it is replaced or the component goes away.
  useEffect(() => {
    const url = clip?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [clip]);

  function startMeter(stream: MediaStream) {
    try {
      const context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      context.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      let frame = 0;
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const v of data) sum += ((v - 128) / 128) ** 2;
        const level = Math.min(1, Math.sqrt(sum / data.length) * 4);
        // Written straight to the element, not to React state, so the meter does not re-render the card.
        if (meterRef.current) meterRef.current.style.transform = `scaleX(${level.toFixed(3)})`;
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      meterCleanupRef.current = () => {
        cancelAnimationFrame(frame);
        void context.close();
      };
    } catch {
      // The meter is decoration. Recording still works without it.
    }
  }

  async function startRecording() {
    setError(null);
    stopAudio();
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      return setError("This browser cannot record audio. You can skip this step and go back to the lesson.");
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      return setError(
        name === "NotFoundError"
          ? "No microphone was found. Plug one in, or skip this step and go back to the lesson."
          : "Microphone access is blocked. Allow it in your browser's site settings, then try again. You can also skip this step.",
      );
    }
    streamRef.current = stream;
    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorderRef.current = recorder;
    chunksRef.current = [];
    recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
    recorder.onstop = () => {
      const seconds = Math.min(MAX_SECONDS, (Date.now() - startedAtRef.current) / 1000);
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || "audio/webm" });
      releaseMic();
      setRecording(false);
      setClip({ url: URL.createObjectURL(blob), seconds });
      setStep(3);
      if (!reportedRef.current) {
        reportedRef.current = true;
        void fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "say_it", itemId: item.id }),
        }).catch(() => {});
      }
    };
    startedAtRef.current = Date.now();
    recorder.start();
    setRecording(true);
    startMeter(stream);
    stopTimerRef.current = setTimeout(() => stopRecording(), MAX_SECONDS * 1000);
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  function playClip() {
    if (!clip) return;
    if (clipPlaying) {
      clipAudioRef.current?.pause();
      setClipPlaying(false);
      return;
    }
    stopAudio();
    const audio = new Audio(clip.url);
    clipAudioRef.current = audio;
    audio.onended = () => setClipPlaying(false);
    audio.onerror = () => setClipPlaying(false);
    setClipPlaying(true);
    void audio.play().catch(() => setClipPlaying(false));
  }

  function tryAgain() {
    clipAudioRef.current?.pause();
    setClipPlaying(false);
    setClip(null);
    setError(null);
    setStep(2);
  }

  return (
    <section className="rise" aria-label="Say it">
      <ol className="mb-6 grid grid-cols-3 gap-2 text-sm font-semibold" aria-label="Steps">
        {STEPS.map((label, i) => (
          <li
            key={label}
            aria-current={step === i + 1 ? "step" : undefined}
            className={`rounded-full border px-3 py-2 text-center ${step === i + 1 ? "border-accent bg-accent-soft text-accent" : "border-line text-muted"}`}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      <div className="card px-6 py-7 text-center">
        <div className="jp text-5xl text-ink">{item.kana}</div>
        {showRomaji && <div className="mt-1 text-muted">{item.romaji}</div>}
        <div className="mt-1 text-ink-2">{item.english}</div>
      </div>

      <div className="mt-6 text-center">
        {step === 1 && (
          <>
            <h2 className="text-2xl">Listen first</h2>
            <p className="mb-5 mt-1 text-muted">Hear how it sounds, then record yourself saying it.</p>
            <div className="mb-6 flex flex-wrap justify-center gap-3">
              <PlayButton text={item.kana} label={item.english} variant="labelled" />
              <PlayButton text={item.kana} label={item.english} variant="labelled" slow />
            </div>
            <button className="btn btn-primary" type="button" onClick={() => setStep(2)}>
              I am ready to record
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-2xl">{recording ? "Listening" : "Record yourself"}</h2>
            <p className="mb-5 mt-1 text-muted">{recording ? "Say it now. It stops by itself after 5 seconds." : "Tap the microphone and say it out loud."}</p>
            <div className="relative mx-auto mb-4 size-20">
              {recording && <span className="recording-ring absolute inset-0 rounded-full bg-accent opacity-30" aria-hidden="true" />}
              <button
                type="button"
                onClick={recording ? stopRecording : startRecording}
                aria-label={recording ? "Stop recording" : "Start recording"}
                className="relative grid size-20 place-items-center rounded-full bg-accent text-[var(--accent-ink)] transition-transform active:scale-95"
              >
                {recording ? <Stop size={30} weight="fill" aria-hidden="true" /> : <Microphone size={30} weight="fill" aria-hidden="true" />}
              </button>
            </div>
            <div className="mx-auto mb-5 h-1.5 w-48 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
              <div ref={meterRef} className="h-full origin-left bg-accent" style={{ transform: "scaleX(0)" }} />
            </div>
            {error && (
              <div className="notice notice-error mx-auto max-w-md text-left" role="alert">
                {error}
              </div>
            )}
            <button className="btn btn-quiet" type="button" onClick={onDone}>
              Skip and go back
            </button>
          </>
        )}

        {step === 3 && clip && (
          <>
            <h2 className="text-2xl">Compare</h2>
            <p className="mb-5 mt-1 text-muted">No score. Just listen for the difference.</p>
            <div className="mb-6 flex flex-wrap justify-center gap-3">
              <PlayButton text={item.kana} label={item.english} variant="labelled" />
              <button type="button" className="btn btn-secondary" onClick={playClip} aria-pressed={clipPlaying}>
                {clipPlaying ? <Stop size={20} weight="bold" aria-hidden="true" /> : <Play size={20} weight="bold" aria-hidden="true" />}
                You ({clip.seconds.toFixed(1)}s)
              </button>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <button className="btn btn-secondary" type="button" onClick={tryAgain}>
                Try again
              </button>
              <button className="btn btn-primary" type="button" onClick={onDone}>
                Done
              </button>
            </div>
          </>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-muted">Your recording stays on this device. It is never uploaded.</p>
    </section>
  );
}
