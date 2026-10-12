"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Microphone } from "@phosphor-icons/react";
import { PlayButton } from "@/components/app/PlayButton";
import { SayIt } from "@/components/app/SayIt";
import { stopAudio } from "@/lib/speech";
import { queueToast, showToast } from "@/lib/toast";

type Part = { kana: string; romaji: string; meaning: string };
type LessonItem = { id: number; kana: string; romaji: string; english: string; note: string; parts: Part[] | null; learned: boolean };

type Props = {
  levelId: number;
  kindLabel: string;
  setOrder: number;
  setName: string;
  nextSetOrder: number | null;
  items: LessonItem[];
  initialIndex: number;
  showRomaji: boolean;
};

type LearnedResponse = {
  learnedItemIds: number[];
  setComplete: boolean;
  awards: { kind: "set" | "level"; points: number; levelId: number; setOrder?: number }[];
  unlockedLevelId: number | null;
  error?: string;
};

export function Lesson({ levelId, kindLabel, setOrder, setName, nextSetOrder, items, initialIndex, showRomaji }: Props) {
  const router = useRouter();
  const [index, setIndex] = useState(initialIndex);
  const [learned, setLearned] = useState(() => new Set(items.filter((i) => i.learned).map((i) => i.id)));
  const [mode, setMode] = useState<"card" | "say">("card");
  const [busy, setBusy] = useState(false);

  const item = items[index];
  const isLast = index === items.length - 1;
  const levelUrl = `/learn/${levelId}`;

  // Leaving a lesson card should never leave audio playing.
  useEffect(() => () => stopAudio(), []);
  useEffect(() => stopAudio(), [index, mode]);

  // Saves are sent one after another, so quick taps on Next never race each other on the server.
  const saves = useRef<Promise<unknown>>(Promise.resolve());

  async function save(itemId: number): Promise<{ ok: boolean; data: LearnedResponse }> {
    try {
      const res = await fetch(`/api/items/${itemId}/learned`, { method: "POST" });
      return { ok: res.ok, data: (await res.json().catch(() => ({}))) as LearnedResponse };
    } catch {
      return { ok: false, data: { error: "We could not reach the server. Check your connection and try again." } as LearnedResponse };
    }
  }

  async function next() {
    if (busy) return;

    // Middle of the set: move on at once and save in the background.
    if (!isLast) {
      const done = item;
      const from = index;
      setIndex(index + 1);
      setLearned((prev) => new Set(prev).add(done.id));
      saves.current = saves.current.then(async () => {
        const { ok, data } = await save(done.id);
        if (ok) return;
        setLearned((prev) => {
          const copy = new Set(prev);
          copy.delete(done.id);
          return copy;
        });
        setIndex(from);
        showToast(data.error ?? "Something went wrong. Please try again.");
      });
      return;
    }

    // Last card: wait for the earlier saves, then settle the set.
    setBusy(true);
    try {
      await saves.current;
      const { ok, data } = await save(item.id);
      if (!ok) {
        showToast(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setLearned(new Set(data.learnedItemIds.concat(item.id)));

      if (!data.setComplete) {
        const firstNew = items.findIndex((i) => !data.learnedItemIds.includes(i.id) && i.id !== item.id);
        showToast("A few items in this set are still new. Take a look at them first.");
        if (firstNew >= 0) setIndex(firstNew);
        return;
      }

      const messages = data.awards.map((a) =>
        a.kind === "set" ? `Level ${a.levelId}, set ${a.setOrder} complete (+${a.points})` : `Level ${a.levelId} complete (+${a.points})`,
      );
      if (data.unlockedLevelId) messages.push(`Level ${data.unlockedLevelId} is open now.`);
      if (messages.length) queueToast(messages.join(". "));
      // A finished set always hands over to the next one, whether or not this was the first time it was finished.
      router.push(nextSetOrder ? `${levelUrl}?set=${nextSetOrder}` : `${levelUrl}?set=${setOrder}`);
    } finally {
      setBusy(false);
    }
  }

  if (mode === "say") {
    return (
      <div>
        <button type="button" className="btn btn-quiet -ml-3 mb-4" onClick={() => setMode("card")}>
          <ArrowLeft size={18} weight="bold" aria-hidden="true" />
          Back to the card
        </button>
        <SayIt item={item} showRomaji={showRomaji} onDone={() => setMode("card")} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <Link href={levelUrl} className="btn btn-quiet -ml-3">
          <ArrowLeft size={18} weight="bold" aria-hidden="true" />
          Level {levelId}
        </Link>
        <div className="text-right text-sm text-muted">
          <div className="font-semibold text-ink">
            Set {setOrder}: {setName}
          </div>
          <div>
            {index + 1} of {items.length}
          </div>
        </div>
      </div>

      <article className="card rise px-6 py-7 text-center sm:px-12 sm:py-9" key={item.id}>
        <span className="tag tag-neutral">{kindLabel}</span>
        <h1 className="jp mt-4 text-5xl text-ink sm:text-6xl" lang="ja">
          {item.kana}
        </h1>
        {showRomaji && <p className="mt-2 text-xl text-muted">{item.romaji}</p>}
        <p className="mt-1 text-2xl text-ink-2">{item.english}</p>

        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <PlayButton text={item.kana} label={item.english} variant="labelled" />
          <PlayButton text={item.kana} label={`${item.english}, slowly`} variant="labelled" slow />
        </div>

        {item.parts && (
          <div className="mt-5 border-t border-line pt-4 text-left">
            <h2 className="mb-2 text-center text-sm font-semibold text-muted">Built from</h2>
            <ul className="flex flex-wrap items-stretch justify-center gap-2">
              {item.parts.map((part, i) => (
                <li key={`${part.kana}-${i}`} className="flex items-center gap-2">
                  {i > 0 && (
                    <span className="text-muted" aria-hidden="true">
                      +
                    </span>
                  )}
                  <PartChip part={part} showRomaji={showRomaji} />
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mx-auto mt-5 max-w-[52ch] rounded-lg bg-surface-2 px-5 py-3 text-left text-ink-2">{item.note}</p>
      </article>

      <div className="mt-3 flex justify-center gap-2" role="group" aria-label="Items in this set">
        {items.map((it, i) => (
          <button
            key={it.id}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Item ${i + 1}${learned.has(it.id) ? ", learned" : ""}`}
            aria-current={i === index ? "step" : undefined}
            className="grid size-6 place-items-center"
          >
            <span
              className={`block h-2.5 rounded-full transition-all ${
                i === index ? "w-6 bg-accent" : learned.has(it.id) ? "w-2.5 bg-ink" : "w-2.5 bg-line-strong"
              }`}
            />
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-3">
        <button type="button" className="btn btn-secondary justify-self-start max-sm:px-3" onClick={() => setIndex(index - 1)} disabled={index === 0}>
          <ArrowLeft size={18} weight="bold" aria-hidden="true" />
          Previous
        </button>
        <button type="button" className="btn btn-quiet justify-self-center" onClick={() => setMode("say")}>
          <Microphone size={18} weight="bold" aria-hidden="true" />
          Say it
        </button>
        <button type="button" className="btn btn-primary justify-self-end max-sm:px-3" onClick={next} disabled={busy}>
          {isLast ? "Finish set" : "Next"}
          {busy ? <span className="spinner" aria-hidden="true" /> : <ArrowRight size={18} weight="bold" aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}

function PartChip({ part, showRomaji }: { part: Part; showRomaji: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 py-1.5 pl-3 pr-1.5">
      <div>
        <div className="jp text-ink" lang="ja">
          {part.kana}
        </div>
        <div className="text-xs text-muted">{showRomaji ? `${part.romaji}: ${part.meaning}` : part.meaning}</div>
      </div>
      <PlayButton text={part.kana} label={part.meaning} />
    </div>
  );
}
