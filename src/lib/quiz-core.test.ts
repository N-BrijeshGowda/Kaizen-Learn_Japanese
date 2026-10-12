import { describe, expect, it } from "vitest";
import {
  buildQuestions,
  dealSets,
  isAlsoCorrect,
  nextReviewState,
  normalizeEnglish,
  pickDistractors,
  planCounts,
  type QuizItem,
} from "@/lib/quiz-core";

const item = (id: number, kana: string, romaji: string, english: string, levelId = 1): QuizItem => ({ id, kana, romaji, english, levelId });

describe("review dates (1, 3, 7, 14, 30 days)", () => {
  it("first right answer is due in 1 day, then the steps climb", () => {
    let state = nextReviewState(null, true);
    expect(state).toEqual({ step: 0, days: 1 });
    const days = [state.days];
    for (let i = 0; i < 4; i++) {
      state = nextReviewState(state.step, true);
      days.push(state.days);
    }
    expect(days).toEqual([1, 3, 7, 14, 30]);
  });

  it("stays at 30 days once it gets there", () => {
    expect(nextReviewState(4, true)).toEqual({ step: 4, days: 30 });
  });

  it("a wrong answer goes back to the first step, due the next day", () => {
    expect(nextReviewState(3, false)).toEqual({ step: 0, days: 1 });
    expect(nextReviewState(null, false)).toEqual({ step: 0, days: 1 });
  });
});

describe("planCounts", () => {
  it("wants 15 new and 10 review", () => {
    expect(planCounts(100, 100)).toEqual({ take: 15, takeReview: 10 });
  });
  it("first day: nothing to review, so new fills all 25 places", () => {
    expect(planCounts(125, 0)).toEqual({ take: 25, takeReview: 0 });
  });
  it("review fills the gap when new items run out", () => {
    expect(planCounts(5, 40)).toEqual({ take: 5, takeReview: 20 });
  });
});

describe("dealSets", () => {
  const ids = (from: number, n: number) => Array.from({ length: n }, (_, i) => from + i);

  it("gives every set 3 new and 2 review questions", () => {
    const newIds = ids(1, 15);
    const reviewIds = ids(100, 10);
    const sets = dealSets(newIds, reviewIds);
    expect(sets).toHaveLength(5);
    for (const set of sets) {
      expect(set).toHaveLength(5);
      expect(set.filter((id) => newIds.includes(id))).toHaveLength(3);
      expect(set.filter((id) => reviewIds.includes(id))).toHaveLength(2);
    }
  });

  it("repeats no item across sets when 25 distinct items exist", () => {
    const sets = dealSets(ids(1, 15), ids(100, 10)).flat();
    expect(new Set(sets).size).toBe(25);
  });

  it("first day: all 25 places are new items", () => {
    const sets = dealSets(ids(1, 25), []);
    expect(new Set(sets.flat()).size).toBe(25);
    sets.forEach((s) => expect(s).toHaveLength(5));
  });

  it("reuses items only to fill places, never twice in one set", () => {
    const sets = dealSets(ids(1, 7), []);
    for (const set of sets) {
      expect(set).toHaveLength(5);
      expect(new Set(set).size).toBe(5);
    }
  });
});

describe("answer options", () => {
  const thanks = item(1, "ありがとう", "arigatoo", "Thanks");
  const thankYou = item(2, "ありがとうございます", "arigatoo gozaimasu", "Thank you (polite)");
  const sorry = item(3, "すみません", "sumimasen", "Excuse me / sorry");
  const yes = item(4, "はい", "hai", "Yes");
  const no = item(5, "いいえ", "iie", "No");
  const ok = item(6, "だいじょうぶ", "daijoobu", "OK / fine");
  const sameMeaning = item(7, "ありがとさん", "arigatosan", "thanks!");

  it("never offers a longer form of the correct phrase", () => {
    expect(isAlsoCorrect(thanks, thankYou)).toBe(true);
    const picked = pickDistractors(thanks, [thankYou, sorry, yes, no, ok]);
    expect(picked.map((p) => p.id)).not.toContain(2);
  });

  it("never offers two options with the same English meaning", () => {
    const picked = pickDistractors(thanks, [sameMeaning, sorry, yes, no, ok]);
    expect(picked.map((p) => p.id)).not.toContain(7);
    const meanings = picked.map((p) => normalizeEnglish(p.english));
    expect(new Set(meanings).size).toBe(meanings.length);
  });

  it("returns three different wrong options that exclude the right one", () => {
    const picked = pickDistractors(thanks, [thankYou, sorry, yes, no, ok]);
    expect(picked).toHaveLength(3);
    expect(picked.map((p) => p.id)).not.toContain(1);
  });

  it("builds 5 questions that alternate listen / phrase, each with the answer among 4 options", () => {
    const pool = Array.from({ length: 30 }, (_, i) => item(i + 1, `かな${"あいうえお"[i % 5]}${i}`, `word${i} x${i}`, `Meaning number ${i} ${"abcdefgh"[i % 8]}`));
    const questions = buildQuestions(pool.slice(0, 5), pool);
    expect(questions).toHaveLength(5);
    expect(questions.map((q) => q.type)).toEqual(["listen", "phrase", "listen", "phrase", "listen"]);
    for (const q of questions) {
      expect(q.options).toHaveLength(4);
      expect(q.options).toContain(q.itemId);
      expect(new Set(q.options).size).toBe(4);
    }
  });
});
