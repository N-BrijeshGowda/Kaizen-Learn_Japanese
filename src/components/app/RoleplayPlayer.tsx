"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Microphone, Stop } from "@phosphor-icons/react";
import { PlayButton } from "@/components/app/PlayButton";
import { stopAudio } from "@/lib/speech";
import { queueToast, showToast } from "@/lib/toast";

type Line = { id: number; speaker: "colleague" | "you"; kana: string; romaji: string; english: string };
type Props = {
  id: number;
  position: number;
  total: number;
  tier: string;
  title: string;
  scene: string;
  lines: Line[];
  completed: boolean;
  nextId: number | null;
  showRomaji: boolean;
};

// Minimal typing for the browser speech-to-text API (Chrome, Edge and Safari expose it; Firefox does not).
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type RecognitionCtor = new () => Recognition;

function getRecognition(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function RoleplayPlayer({ id, position, total, tier, title, scene, lines, completed, nextId, showRomaji }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState<number | null>(null);
  const [heard, setHeard] = useState<Record<number, string>>({});
  const recRef = useRef<Recognition | null>(null);

  useEffect(
    () => () => {
      recRef.current?.abort();
      stopAudio();
    },
    [],
  );

  function toggleRecord(line: Line) {
    if (recording === line.id) return recRef.current?.stop();
    const Ctor = getRecognition();
    if (!Ctor) return showToast("Voice recording is not supported in this browser. Try Chrome or Edge.");
    recRef.current?.abort();
    stopAudio();
    const rec = new Ctor();
    rec.lang = "ja-JP";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      const text = Array.from(e.results)
        .map((r) => r[0]?.transcript ?? "")
        .join("");
      setHeard((h) => ({ ...h, [line.id]: text }));
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") showToast("Microphone access is blocked. Allow it in your browser settings and try again.");
      else if (e.error === "no-speech") showToast("We did not hear anything. Tap Record and try again.");
      else if (e.error !== "aborted") showToast("Voice recording failed. Please try again.");
    };
    rec.onend = () => {
      setRecording((cur) => (cur === line.id ? null : cur));
      if (recRef.current === rec) recRef.current = null;
    };
    recRef.current = rec;
    setHeard((h) => ({ ...h, [line.id]: "" }));
    setRecording(line.id);
    try {
      rec.start();
    } catch {
      setRecording(null);
      showToast("Voice recording failed. Please try again.");
    }
  }

  async function markComplete() {
    if (completed) {
      router.push(nextId ? `/roleplay/${nextId}` : "/roleplay");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/roleplays/${id}/complete`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { firstTime?: boolean; points?: number; nextId?: number | null; error?: string };
      if (!res.ok) return showToast(data.error ?? "Something went wrong. Please try again.");
      recRef.current?.abort();
      stopAudio();
      queueToast(data.firstTime ? `Role-play complete (+${data.points}). ${data.nextId ? "Next one unlocked." : "That was the last one."}` : "Role-play marked complete.");
      router.push("/roleplay");
      router.refresh();
    } catch {
      showToast("We could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Link href="/roleplay" className="btn btn-quiet -ml-3 mb-2">
        <ArrowLeft size={18} weight="bold" aria-hidden="true" />
        Role-play
      </Link>

      <header className="rise">
        <p className="text-sm font-semibold text-accent">
          Role-play {position} of {total}, {tier}
        </p>
        <h1 className="mt-2 text-4xl">{title}</h1>
        <p className="mt-2 text-ink-2">{scene}</p>
        <p className="mt-2 text-sm text-muted">Tap Record and say your reply in Japanese. Stuck? Press and hold the card for a hint.</p>
      </header>

      <ol className="mt-6 grid gap-4" aria-label="Conversation">
        {lines.map((line) => {
          if (line.speaker === "colleague") {
            return (
              <li key={line.id} className="flex justify-start">
                <div className="flex max-w-[92%] items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 sm:max-w-[80%]">
                  <div className="min-w-0">
                    <p className="mb-1 text-xs font-semibold text-muted">Colleague</p>
                    <p className="jp text-lg text-ink" lang="ja">
                      {line.kana}
                    </p>
                    {showRomaji && <p className="text-sm text-muted">{line.romaji}</p>}
                    <p className="text-sm text-ink-2">{line.english}</p>
                  </div>
                  <PlayButton text={line.kana} label={line.english} onBeforePlay={stopAudio} />
                </div>
              </li>
            );
          }
          const isRecording = recording === line.id;
          const text = heard[line.id];
          return (
            <li key={line.id} className="flex justify-end">
              <div className="w-full max-w-[92%] sm:max-w-[80%]">
                <p className="mb-1 text-right text-xs font-semibold text-muted">You</p>
                <HintCard line={line} showRomaji={showRomaji} />
                <div className="mt-3 flex items-start gap-3">
                  <button type="button" className={`btn ${isRecording ? "btn-primary" : "btn-secondary"}`} onClick={() => toggleRecord(line)} aria-pressed={isRecording}>
                    {isRecording ? <Stop size={18} weight="bold" aria-hidden="true" /> : <Microphone size={18} weight="bold" aria-hidden="true" />}
                    {isRecording ? "Stop" : text ? "Record again" : "Record"}
                  </button>
                  <p className="jp min-h-10 flex-1 py-2 text-lg text-ink" lang="ja" aria-live="polite">
                    {isRecording && !text ? <span className="text-sm text-muted">Listening…</span> : text}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-primary" onClick={markComplete} disabled={busy}>
          <Check size={18} weight="bold" aria-hidden="true" />
          {completed ? (nextId ? "Done. Next role-play" : "All role-plays done") : "Mark complete"}
        </button>
        {!completed && <span className="text-sm text-muted">Earns 30 points the first time and opens the next one.</span>}
      </div>
    </div>
  );
}

/** A flip card: the answer shows only while the card is held down, and flips back on release. */
function HintCard({ line, showRomaji }: { line: Line; showRomaji: boolean }) {
  const [flipped, setFlipped] = useState(false);
  const face: React.CSSProperties = { gridArea: "1 / 1", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" };
  const release = () => setFlipped(false);
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Hold to see a hint"
      aria-pressed={flipped}
      className="select-none rounded-xl outline-offset-2"
      style={{ perspective: 1000, touchAction: "none", WebkitTouchCallout: "none" }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId);
        setFlipped(true);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          setFlipped(true);
        }
      }}
      onKeyUp={release}
      onBlur={release}
    >
      <div className="grid transition-transform duration-300 motion-reduce:duration-0" style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "none" }}>
        <div style={face} className="flex min-h-28 flex-col items-center justify-center rounded-xl border-2 border-dashed border-line bg-surface-2 px-4 py-4 text-center">
          <p className="font-semibold text-ink">Need a hint?</p>
          <p className="text-sm text-muted">Press and hold this card</p>
        </div>
        <div style={{ ...face, transform: "rotateY(180deg)" }} className="flex min-h-28 flex-col items-center justify-center rounded-xl border-2 border-accent bg-accent-soft px-4 py-4 text-center">
          <p className="jp text-xl text-ink" lang="ja">
            {line.kana}
          </p>
          {showRomaji && <p className="text-sm text-muted">{line.romaji}</p>}
          <p className="text-sm text-ink-2">{line.english}</p>
        </div>
      </div>
    </div>
  );
}
