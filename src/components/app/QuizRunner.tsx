"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, X } from "@phosphor-icons/react";
import { PlayButton } from "@/components/app/PlayButton";
import { playJapanese, stopAudio } from "@/lib/speech";
import { scoreHeading } from "@/lib/quiz-core";
import { showToast } from "@/lib/toast";

type Kind = "daily" | "unlock" | "level";
type Option = { itemId: number; kana: string; romaji: string; english: string };
type Question = { index: number; type: "listen" | "phrase"; tag: string | null; audioText: string; englishPrompt: string; options: Option[] };
type Started = { attemptId: number; kind: Kind; title: string; setNo: number | null; level: number | null; questions: Question[] };
type Answered = { correct: boolean; item: Option };
type Summary = {
  kind: Kind;
  score: number;
  total: number;
  pointsAwarded: number;
  bonus: number;
  passed: boolean | null;
  unlockedLevel: number | null;
  firstDailyOfDay: boolean;
  goalJustMet: boolean;
  streak: number | null;
  setNo: number | null;
  nextSetNo: number | null;
  level: number | null;
};

type Props = { kind: Kind; setNo?: number; level?: number; showRomaji: boolean; backHref: string; backLabel: string };

async function post<T>(url: string, body: unknown): Promise<{ ok: boolean; data: T & { error?: string } }> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { ok: res.ok, data: (await res.json().catch(() => ({}))) as T & { error?: string } };
}

export function QuizRunner({ kind, setNo, level, showRomaji, backHref, backLabel }: Props) {
  const router = useRouter();
  const [quiz, setQuiz] = useState<Started | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [answered, setAnswered] = useState<Answered | null>(null);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [autoOff, setAutoOff] = useState(false);
  const startedRef = useRef(false);
  const nextRef = useRef<() => void>(() => {});

  const begin = useCallback(async () => {
    setError(null);
    setQuiz(null);
    setSummary(null);
    setIndex(0);
    setChosen(null);
    setAnswered(null);
    setAutoOff(false);
    try {
      const { ok, data } = await post<Started>("/api/quiz/start", { kind, set: setNo, level });
      if (!ok) return setError(data.error ?? "Could not open the quiz. Please try again.");
      setQuiz(data);
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    }
  }, [kind, setNo, level]);

  // One quiz is opened per visit even if React runs the effect twice in development.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void begin();
  }, [begin]);

  useEffect(() => () => stopAudio(), []);

  const question = quiz?.questions[index];

  async function choose(option: Option) {
    if (!quiz || !question || answered || busy) return;
    setBusy(true);
    setChosen(option.itemId);
    try {
      const { ok, data } = await post<Answered>("/api/quiz/answer", { attemptId: quiz.attemptId, index, chosen: option.itemId });
      if (!ok) {
        setChosen(null);
        return showToast(data.error ?? "Could not save that answer. Please try again.");
      }
      setAnswered(data);
      // "See the English" questions play the Japanese after the answer.
      if (question.type === "phrase") playJapanese({ text: data.item.kana });
    } catch {
      setChosen(null);
      showToast("We could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  // Daily quiz: a correct answer moves on by itself after 2 seconds. A wrong answer waits for "Next".
  const autoAdvance = kind === "daily" && Boolean(answered?.correct) && !autoOff;
  useEffect(() => {
    if (!autoAdvance) return;
    const timer = setTimeout(() => nextRef.current(), 2000);
    return () => clearTimeout(timer);
  }, [autoAdvance, index]);

  async function next() {
    if (!quiz || !answered) return;
    stopAudio();
    if (index < quiz.questions.length - 1) {
      setIndex(index + 1);
      setChosen(null);
      setAnswered(null);
      return;
    }
    setBusy(true);
    try {
      const { ok, data } = await post<Summary>("/api/quiz/complete", { attemptId: quiz.attemptId });
      if (!ok) {
        setAutoOff(true);
        return showToast(data.error ?? "Could not finish the quiz. Please try again.");
      }
      setSummary(data);
      if (data.goalJustMet) showToast(`Daily goal complete. Streak: ${data.streak ?? 1} ${data.streak === 1 ? "day" : "days"}`);
      router.refresh();
    } catch {
      setAutoOff(true);
      showToast("We could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }
  nextRef.current = next;

  if (error) {
    return (
      <div className="rise">
        <BackLink href={backHref} label={backLabel} />
        <div className="notice notice-error mt-4" role="alert">
          {error}
        </div>
        <div className="flex gap-3">
          <button className="btn btn-primary" type="button" onClick={begin}>
            Try again
          </button>
          <Link href={backHref} className="btn btn-secondary">
            {backLabel}
          </Link>
        </div>
      </div>
    );
  }

  if (!quiz) return <QuizSkeleton />;
  if (summary) return <Score summary={summary} title={quiz.title} onRetry={begin} onNew={(n) => router.push(`/quiz/daily?set=${n}`)} />;

  const last = index === quiz.questions.length - 1;
  const percent = (index / quiz.questions.length) * 100 + (answered ? 100 / quiz.questions.length : 0);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <BackLink href={backHref} label={backLabel} />
        <span className="text-sm font-semibold text-muted" aria-live="polite">
          {index + 1} of {quiz.questions.length}
        </span>
      </div>
      <div className="progress mb-4" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100} aria-label="Quiz progress">
        <i style={{ width: `${percent}%` }} />
      </div>

      <section className="card px-6 py-6 text-center sm:px-10" key={question!.index}>
        <div className="mb-3 flex min-h-6 flex-wrap items-center justify-center gap-2">
          <span className="eyebrow">{quiz.title}</span>
          {question!.tag && <span className={`tag ${question!.tag === "Review" ? "tag-yellow" : "tag-blue"}`}>{question!.tag}</span>}
        </div>

        {question!.type === "listen" ? (
          <>
            <h1 className="text-3xl">What does this mean?</h1>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <PlayButton text={question!.audioText} label="the phrase" variant="labelled" />
              <PlayButton text={question!.audioText} label="the phrase, slowly" variant="labelled" slow />
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-muted">How do you say it in Japanese?</p>
            <h1 className="mt-2 text-4xl">{question!.englishPrompt}</h1>
          </>
        )}
      </section>

      <div className="mt-3 grid gap-2" role="group" aria-label="Answers">
        {question!.options.map((option) => {
          const isCorrect = answered?.item.itemId === option.itemId;
          const isWrongPick = answered && !answered.correct && chosen === option.itemId;
          const state = isCorrect ? "correct" : isWrongPick ? "wrong" : "idle";
          return (
            <button
              key={option.itemId}
              type="button"
              disabled={Boolean(answered) || busy}
              onClick={() => choose(option)}
              aria-pressed={chosen === option.itemId}
              className={`flex min-h-14 items-center justify-between gap-3 rounded-lg border-2 px-5 py-2 text-left transition-colors ${
                state === "correct"
                  ? "border-[var(--tag-green-ink)] bg-[var(--tag-green-bg)] text-[var(--tag-green-ink)]"
                  : state === "wrong"
                    ? "border-[var(--tag-red-ink)] bg-[var(--tag-red-bg)] text-[var(--tag-red-ink)]"
                    : answered
                      ? "border-line text-muted"
                      : "border-line bg-surface text-ink hover:border-accent hover:bg-accent-soft"
              }`}
            >
              {question!.type === "listen" ? (
                <span className="font-semibold">{option.english}</span>
              ) : (
                <span>
                  <span className="jp block text-lg" lang="ja">
                    {option.kana}
                  </span>
                  {showRomaji && <span className="block text-sm opacity-80">{option.romaji}</span>}
                </span>
              )}
              {state === "correct" && <Check size={20} weight="bold" aria-label="Correct answer" />}
              {state === "wrong" && <X size={20} weight="bold" aria-label="Your answer, not correct" />}
            </button>
          );
        })}
      </div>

      <div className="mt-3 min-h-20" aria-live="polite">
        {answered && (
          <div className="rise">
            <p className={`font-semibold ${answered.correct ? "text-[var(--tag-green-ink)]" : "text-ink"}`}>
              {answered.correct
                ? "Right."
                : `Not quite. It is ${answered.item.kana}${showRomaji ? ` (${answered.item.romaji})` : ""}, "${answered.item.english}".`}
            </p>
            {!autoAdvance && (
              <button className="btn btn-primary mt-3" type="button" onClick={next} disabled={busy}>
                {last ? "See my score" : "Next"}
                {busy ? <span className="spinner" aria-hidden="true" /> : <ArrowRight size={18} weight="bold" aria-hidden="true" />}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="btn btn-quiet -ml-3">
      <ArrowLeft size={18} weight="bold" aria-hidden="true" />
      {label}
    </Link>
  );
}

function QuizSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading the quiz" className="motion-safe:animate-pulse">
      <div className="mb-2 h-10 w-28 rounded-lg bg-surface-2" />
      <div className="progress mb-4" />
      <div className="card h-36" />
      <div className="mt-3 grid gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-lg border border-line bg-surface" />
        ))}
      </div>
    </div>
  );
}

function Score({ summary, title, onRetry, onNew }: { summary: Summary; title: string; onRetry: () => void; onNew: (setNo: number) => void }) {
  const { kind, score, total } = summary;
  const unlockFailed = kind === "unlock" && summary.passed === false;
  const unlocked = kind === "unlock" && summary.passed;

  const heading = unlocked ? `Level ${summary.unlockedLevel} unlocked` : unlockFailed ? "Not yet" : scoreHeading(score);

  let body: React.ReactNode;
  if (kind === "daily") {
    body = summary.firstDailyOfDay ? (
      <>
        You earned <strong className="text-ink">{summary.pointsAwarded} points</strong> toward the ranking.{" "}
        {summary.goalJustMet ? `Today's goal is complete. Streak: ${summary.streak} ${summary.streak === 1 ? "day" : "days"}.` : "Learn 5 words or phrases today to complete your goal."}
      </>
    ) : (
      "Retakes are for practice. Points count once a day."
    );
  } else if (unlocked) {
    body = (
      <>
        You earned <strong className="text-ink">{summary.pointsAwarded} points</strong> (including a {summary.bonus} point bonus). Every level up to it is open too.
      </>
    );
  } else if (unlockFailed) {
    body = "You need 4 out of 5 to unlock. Practise the earlier levels and try again.";
  } else {
    body = "Practice only, so no points. Words you miss come back in your daily quiz.";
  }

  return (
    <div className="rise text-center">
      <div className="card px-6 py-8">
        <p className="eyebrow">{title}</p>
        <p className="mt-4 text-7xl font-semibold text-accent">
          {score}
          <span className="text-3xl text-muted"> / {total}</span>
        </p>
        <h1 className="mt-4 text-3xl">{heading}</h1>
        <p className="mx-auto mt-2 max-w-[46ch] text-ink-2">{body}</p>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {kind === "daily" && (
          <>
            <Link href="/" className="btn btn-secondary">
              Back to Today
            </Link>
            <button className="btn btn-primary" type="button" onClick={() => onNew(summary.nextSetNo ?? 2)}>
              New quiz
            </button>
          </>
        )}
        {kind === "unlock" && (
          <>
            {unlocked ? (
              <Link href={`/learn/${summary.unlockedLevel}`} className="btn btn-primary">
                Open Level {summary.unlockedLevel}
              </Link>
            ) : (
              <>
                <Link href="/learn" className="btn btn-secondary">
                  Back to Learn
                </Link>
                <button className="btn btn-primary" type="button" onClick={onRetry}>
                  Try again
                </button>
              </>
            )}
          </>
        )}
        {kind === "level" && (
          <>
            <Link href={`/learn/${summary.level}`} className="btn btn-secondary">
              Back to Level {summary.level}
            </Link>
            <button className="btn btn-primary" type="button" onClick={onRetry}>
              Take it again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
