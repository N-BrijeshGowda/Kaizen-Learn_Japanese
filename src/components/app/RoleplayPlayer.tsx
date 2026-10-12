"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Headphones, Microphone, Stop } from "@phosphor-icons/react";
import { PlayButton } from "@/components/app/PlayButton";
import { YOUR_TURN_MS } from "@/lib/roleplay-core";
import { audioAvailable, playJapanese, stopAudio } from "@/lib/speech";
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

type Mode = "idle" | "all" | "part";

export function RoleplayPlayer({ id, position, total, tier, title, scene, lines, completed, nextId, showRomaji }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("idle");
  const [active, setActive] = useState<number | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const run = useRef(0);

  /** Stops whatever is playing. Every new playback or leaving the screen goes through here (FR-P5). */
  const stop = useCallback(() => {
    run.current += 1;
    stopAudio();
    setMode("idle");
    setActive(null);
    setHint(null);
  }, []);

  useEffect(() => () => {
    run.current += 1;
    stopAudio();
  }, []);

  const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
  const speak = (text: string) => new Promise<void>((resolve) => playJapanese({ text, onEnd: resolve, onError: resolve }));

  async function play(kind: Exclude<Mode, "idle">) {
    if (mode === kind) return stop();
    if (!audioAvailable()) return showToast("Audio is not available in this browser. You can still read the conversation.");
    stop();
    const mine = ++run.current;
    setMode(kind);
    for (const [i, line] of lines.entries()) {
      if (run.current !== mine) return;
      setActive(i);
      if (kind === "part" && line.speaker === "you") {
        setHint("Your turn: say it out loud.");
        await wait(YOUR_TURN_MS);
      } else {
        setHint(null);
        await speak(line.kana);
      }
    }
    if (run.current === mine) {
      setMode("idle");
      setActive(null);
      setHint(null);
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
      stop();
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
      </header>

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" className="btn btn-secondary" onClick={() => play("all")} aria-pressed={mode === "all"}>
          {mode === "all" ? <Stop size={18} weight="bold" aria-hidden="true" /> : <Headphones size={18} weight="bold" aria-hidden="true" />}
          {mode === "all" ? "Stop" : "Listen to all"}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => play("part")} aria-pressed={mode === "part"}>
          {mode === "part" ? <Stop size={18} weight="bold" aria-hidden="true" /> : <Microphone size={18} weight="bold" aria-hidden="true" />}
          {mode === "part" ? "Stop" : "Practise my part"}
        </button>
      </div>
      <p className="mt-3 min-h-6 text-sm font-semibold text-accent" aria-live="polite">
        {hint}
      </p>

      <ol className="mt-2 grid gap-3" aria-label="Conversation">
        {lines.map((line, i) => {
          const mine = line.speaker === "you";
          return (
            <li key={line.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`flex max-w-[92%] items-center gap-3 rounded-xl border px-4 py-3 transition-colors sm:max-w-[80%] ${
                  active === i ? "border-accent bg-accent-soft" : mine ? "border-line bg-surface-2" : "border-line bg-surface"
                }`}
              >
                <div className="min-w-0">
                  <p className="mb-1 text-xs font-semibold text-muted">{mine ? "You" : "Colleague"}</p>
                  <p className="jp text-lg text-ink" lang="ja">
                    {line.kana}
                  </p>
                  {showRomaji && <p className="text-sm text-muted">{line.romaji}</p>}
                  <p className="text-sm text-ink-2">{line.english}</p>
                </div>
                <PlayButton text={line.kana} label={line.english} onBeforePlay={stop} />
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
