"use client";

import { useEffect, useRef, useState } from "react";
import { SpeakerHigh, Stop, Hourglass } from "@phosphor-icons/react";
import { audioAvailable, playJapanese, stopAudio } from "@/lib/speech";
import { showToast } from "@/lib/toast";

type Props = {
  text: string;
  label: string;
  src?: string | null;
  slow?: boolean;
  /** "icon" is a round play control for list rows; "labelled" is a wider button with text. */
  variant?: "icon" | "labelled";
  /** Runs just before this button starts playing, so a parent playing a sequence can stop it first. */
  onBeforePlay?: () => void;
};

export function PlayButton({ text, label, src, slow = false, variant = "icon", onBeforePlay }: Props) {
  const [playing, setPlaying] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => () => stopRef.current?.(), []);

  function toggle() {
    if (playing) {
      stopAudio();
      setPlaying(false);
      return;
    }
    if (!audioAvailable()) {
      showToast("Audio is not available in this browser. You can still use the card.");
      return;
    }
    onBeforePlay?.();
    setPlaying(true);
    stopRef.current = playJapanese({
      text,
      src,
      slow,
      onEnd: () => setPlaying(false),
      onError: () => {
        setPlaying(false);
        showToast("Audio could not play. You can still use the card.");
      },
    });
  }

  const Icon = playing ? Stop : slow ? Hourglass : SpeakerHigh;

  if (variant === "labelled") {
    return (
      <button type="button" onClick={toggle} className="btn btn-secondary" aria-pressed={playing}>
        <Icon size={20} weight="bold" aria-hidden="true" />
        {slow ? "Slow" : "Listen"}
        <span className="sr-only">: {label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`${playing ? "Stop" : "Play"} ${label}`}
      aria-pressed={playing}
      className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent transition-colors hover:bg-accent hover:text-[var(--accent-ink)]"
    >
      <Icon size={20} weight="bold" aria-hidden="true" />
    </button>
  );
}
