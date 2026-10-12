// Pure quiz rules (PRD 5.5, 7.7, 7.8). No database here, so everything below is unit tested.
import { NEW_PER_SET, QUIZ_LENGTH, QUIZ_SETS_PER_DAY, REVIEW_PER_SET, REVIEW_STEPS_DAYS } from "@/lib/config";

export type QuizItem = { id: number; kana: string; romaji: string; english: string; levelId: number };
export type QuestionType = "listen" | "phrase";
export type Rng = () => number;

export function shuffle<T>(values: readonly T[], rng: Rng = Math.random): T[] {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Where an item's review date goes after an answer.
 * Right: one step further along 1, 3, 7, 14, 30 days (the first right answer lands on step 0, due in 1 day).
 * Wrong: back to the first step, due again the next day.
 */
export function nextReviewState(previousStep: number | null, correct: boolean): { step: number; days: number } {
  const last = REVIEW_STEPS_DAYS.length - 1;
  const step = correct && previousStep !== null ? Math.min(previousStep + 1, last) : 0;
  return { step, days: REVIEW_STEPS_DAYS[step] };
}

/**
 * Deals the day's items into sets. Each set aims for 3 new and 2 review questions (15 new and 10 review overall).
 * If one kind runs short the other fills the gap. Items are only reused across sets when fewer than 25 distinct
 * items exist, and never twice inside the same set.
 */
export function dealSets(newIds: readonly number[], reviewIds: readonly number[]): number[][] {
  const newQueue = [...newIds];
  const reviewQueue = [...reviewIds];
  const sets: number[][] = Array.from({ length: QUIZ_SETS_PER_DAY }, () => []);

  for (const set of sets) {
    while (set.length < NEW_PER_SET && newQueue.length) set.push(newQueue.shift()!);
    while (set.length < NEW_PER_SET + REVIEW_PER_SET && reviewQueue.length && countReview(set, reviewIds) < REVIEW_PER_SET) {
      set.push(reviewQueue.shift()!);
    }
  }
  for (const set of sets) {
    while (set.length < QUIZ_LENGTH && (newQueue.length || reviewQueue.length)) {
      set.push(newQueue.length ? newQueue.shift()! : reviewQueue.shift()!);
    }
  }
  const everything = [...newIds, ...reviewIds];
  for (const set of sets) {
    for (const id of everything) {
      if (set.length >= QUIZ_LENGTH) break;
      if (!set.includes(id)) set.push(id);
    }
  }
  return sets;
}

const countReview = (set: number[], reviewIds: readonly number[]) => set.filter((id) => reviewIds.includes(id)).length;

/** How many of each kind to take from the pools: 15 new + 10 review, the shorter pool is topped up by the other. */
export function planCounts(newAvailable: number, reviewAvailable: number): { take: number; takeReview: number } {
  const wantNew = NEW_PER_SET * QUIZ_SETS_PER_DAY;
  const wantReview = REVIEW_PER_SET * QUIZ_SETS_PER_DAY;
  let take = Math.min(wantNew, newAvailable);
  let takeReview = Math.min(wantReview, reviewAvailable);
  if (take < wantNew) takeReview = Math.min(reviewAvailable, wantReview + (wantNew - take));
  if (takeReview < wantReview) take = Math.min(newAvailable, wantNew + (wantReview - takeReview));
  return { take, takeReview };
}

export function normalizeEnglish(text: string): string {
  return text
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when `other` could also be accepted as the answer: same meaning, or a longer or shorter form of the same phrase. */
export function isAlsoCorrect(correct: QuizItem, other: QuizItem): boolean {
  if (normalizeEnglish(correct.english) === normalizeEnglish(other.english)) return true;
  if (correct.kana.includes(other.kana) || other.kana.includes(correct.kana)) return true;
  const a = correct.romaji.toLowerCase();
  const b = other.romaji.toLowerCase();
  return a.includes(b) || b.includes(a);
}

function similarity(correct: QuizItem, other: QuizItem, rng: Rng): number {
  const lengthGap = Math.abs(correct.kana.length - other.kana.length);
  const correctWords = new Set(correct.romaji.toLowerCase().split(/\s+/));
  const sharedWords = other.romaji.toLowerCase().split(/\s+/).filter((w) => correctWords.has(w)).length;
  return (
    10 -
    Math.min(lengthGap, 10) +
    (other.kana[0] === correct.kana[0] ? 3 : 0) +
    (other.kana.at(-1) === correct.kana.at(-1) ? 2 : 0) +
    sharedWords * 2 +
    (other.levelId === correct.levelId ? 1 : 0) +
    rng() * 4 // jitter, so the same question does not always show the same wrong answers
  );
}

/** The most confusable wrong options that cannot also be right and do not repeat a meaning or a Japanese text. */
export function pickDistractors(correct: QuizItem, pool: readonly QuizItem[], count = 3, rng: Rng = Math.random): QuizItem[] {
  const seenEnglish = new Set([normalizeEnglish(correct.english)]);
  const seenKana = new Set([correct.kana]);
  const eligible = pool
    .filter((c) => c.id !== correct.id && !isAlsoCorrect(correct, c))
    .map((c) => ({ c, score: similarity(correct, c, rng) }))
    .sort((x, y) => y.score - x.score);

  const chosen: QuizItem[] = [];
  for (const { c } of eligible) {
    const e = normalizeEnglish(c.english);
    if (seenEnglish.has(e) || seenKana.has(c.kana)) continue;
    seenEnglish.add(e);
    seenKana.add(c.kana);
    chosen.push(c);
    if (chosen.length === count) break;
  }
  return chosen;
}

export type QuestionDef = { itemId: number; type: QuestionType; options: number[] };

/**
 * Turns 5 items into 5 questions. Order is shuffled; types then alternate by position: odd questions are
 * "listen and pick the meaning", even questions are "see the English and pick the Japanese".
 */
export function buildQuestions(items: readonly QuizItem[], pool: readonly QuizItem[], rng: Rng = Math.random): QuestionDef[] {
  return shuffle(items, rng).map((item, index) => {
    const distractors = pickDistractors(item, pool, 3, rng);
    return {
      itemId: item.id,
      type: index % 2 === 0 ? "listen" : "phrase",
      options: shuffle([item, ...distractors], rng).map((o) => o.id),
    };
  });
}

export function scoreHeading(score: number): string {
  if (score >= 5) return "Perfect score!";
  if (score >= 3) return "Nice work";
  return "Keep going";
}
