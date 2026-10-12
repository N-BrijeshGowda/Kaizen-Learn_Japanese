import "server-only";
import { prisma } from "@/lib/db";
import {
  NEW_PER_SET,
  POINTS_PER_RIGHT_ANSWER,
  QUIZ_LENGTH,
  QUIZ_SETS_PER_DAY,
  REVIEW_PER_SET,
  UNLOCK_BONUS_POINTS,
  UNLOCK_PASS_MARK,
} from "@/lib/config";
import { dayQualifies } from "@/lib/goal";
import { RuleError } from "@/lib/learning";
import {
  buildQuestions,
  dealSets,
  nextReviewState,
  planCounts,
  shuffle,
  type QuestionDef,
  type QuizItem,
} from "@/lib/quiz-core";
import { refreshStreak } from "@/lib/streak";
import { addDays, dateOnly, istDateString } from "@/lib/time";

export type QuizKind = "daily" | "unlock" | "level";

type StoredQuestion = QuestionDef & { tag: string | null; chosen?: number; correct?: boolean };
type StoredAnswers = { questions: StoredQuestion[] };

const toQuizItem = (row: { id: number; kana: string; romaji: string; english: string; set: { levelId: number } }): QuizItem => ({
  id: row.id,
  kana: row.kana,
  romaji: row.romaji,
  english: row.english,
  levelId: row.set.levelId,
});

/** Items of the given levels in curriculum order. */
async function itemsOfLevels(levelIds: number[]): Promise<QuizItem[]> {
  if (!levelIds.length) return [];
  const rows = await prisma.item.findMany({
    where: { set: { levelId: { in: levelIds }, level: { status: "published" } } },
    include: { set: { select: { levelId: true, order: true } } },
    orderBy: [{ set: { levelId: "asc" } }, { set: { order: "asc" } }, { order: "asc" }],
  });
  return rows.map(toQuizItem);
}

async function unlockedLevelIds(userId: number): Promise<number[]> {
  const rows = await prisma.userLevel.findMany({ where: { userId }, select: { levelId: true } });
  return rows.map((r) => r.levelId).sort((a, b) => a - b);
}

// ---------------------------------------------------------------------------------------------
// The day's five sets
// ---------------------------------------------------------------------------------------------

/** Builds the day's 5 sets on the first request of the IST day, then keeps them fixed (FR-Q3, FR-Q11). */
export async function ensureQuizSets(userId: number) {
  const today = istDateString();
  const existing = await prisma.quizSet.findMany({ where: { userId, localDate: dateOnly(today) }, orderBy: { setNo: "asc" } });
  if (existing.length >= QUIZ_SETS_PER_DAY) return existing;

  const levels = await unlockedLevelIds(userId);
  const items = await itemsOfLevels(levels);
  const reviewRows = await prisma.userItemReview.findMany({ where: { userId } });
  const reviewed = new Set(reviewRows.map((r) => r.itemId));
  const learnedRows = await prisma.userItem.findMany({ where: { userId, learnedAt: { not: null } }, select: { itemId: true } });
  const learned = new Set(learnedRows.map((r) => r.itemId));

  // New questions: never quizzed. Learned items first, then unseen items from unlocked levels, newest level first.
  const never = items.filter((i) => !reviewed.has(i.id));
  const learnedFirst = never.filter((i) => learned.has(i.id));
  const unseen = never
    .filter((i) => !learned.has(i.id))
    .sort((a, b) => b.levelId - a.levelId); // stable sort keeps curriculum order inside a level
  const newPool = [...learnedFirst, ...unseen].map((i) => i.id);

  // Review questions: due first (longest overdue first), then due soonest.
  const inScope = new Set(items.map((i) => i.id));
  const todayDate = dateOnly(today);
  const reviewPool = reviewRows
    .filter((r) => inScope.has(r.itemId))
    .sort((a, b) => {
      const aDue = a.dueDate <= todayDate ? 0 : 1;
      const bDue = b.dueDate <= todayDate ? 0 : 1;
      return aDue - bDue || a.dueDate.getTime() - b.dueDate.getTime();
    })
    .map((r) => r.itemId);

  const { take, takeReview } = planCounts(newPool.length, reviewPool.length);
  const sets = dealSets(newPool.slice(0, take), reviewPool.slice(0, takeReview));
  const maxLevel = levels.at(-1) ?? 1;

  for (const [index, ids] of sets.entries()) {
    try {
      await prisma.quizSet.create({
        data: { userId, localDate: todayDate, setNo: index + 1, itemIds: JSON.stringify(ids), builtForMaxLevel: maxLevel },
      });
    } catch (error) {
      // A second request built it first. That is fine, we read theirs below.
      if ((error as { code?: string }).code !== "P2002") throw error;
    }
  }
  return prisma.quizSet.findMany({ where: { userId, localDate: todayDate }, orderBy: { setNo: "asc" } });
}

/**
 * A level was just unlocked: every set not yet answered today is rebuilt as 3 questions from the new level plus
 * 2 from earlier levels the learner has not been quizzed on, starting with the set they would open next.
 * If fewer than 2 earlier items exist, new-level items fill the places. Answered sets never change (FR-Q10).
 */
export async function rebuildUnansweredSets(userId: number, newLevelId: number) {
  const todayDate = dateOnly(istDateString());
  const sets = await prisma.quizSet.findMany({ where: { userId, localDate: todayDate }, orderBy: { setNo: "asc" } });
  if (!sets.length) return; // not built yet today: the first build will already prefer the new level

  const answered = await prisma.quizAttempt.findMany({
    where: { userId, kind: "daily", completedAt: { not: null }, quizSetId: { in: sets.map((s) => s.id) } },
    select: { quizSetId: true },
  });
  const answeredIds = new Set(answered.map((a) => a.quizSetId));
  const lastAnsweredNo = Math.max(0, ...sets.filter((s) => answeredIds.has(s.id)).map((s) => s.setNo));
  const order = [...sets.slice(lastAnsweredNo), ...sets.slice(0, lastAnsweredNo)].filter((s) => !answeredIds.has(s.id));
  if (!order.length) return;

  const levels = await unlockedLevelIds(userId);
  const items = await itemsOfLevels(levels);
  const reviewed = new Set((await prisma.userItemReview.findMany({ where: { userId }, select: { itemId: true } })).map((r) => r.itemId));
  const learned = new Set(
    (await prisma.userItem.findMany({ where: { userId, learnedAt: { not: null } }, select: { itemId: true } })).map((r) => r.itemId),
  );

  const fresh = items.filter((i) => !reviewed.has(i.id));
  const newLevelQueue = fresh.filter((i) => i.levelId === newLevelId).map((i) => i.id);
  const earlier = fresh.filter((i) => i.levelId < newLevelId);
  const earlierQueue = [...earlier.filter((i) => learned.has(i.id)), ...earlier.filter((i) => !learned.has(i.id)).sort((a, b) => b.levelId - a.levelId)].map((i) => i.id);

  for (const set of order) {
    const chosen: number[] = [];
    const takeFrom = (queue: number[], n: number) => {
      while (n > 0 && queue.length) {
        chosen.push(queue.shift()!);
        n--;
      }
    };
    takeFrom(newLevelQueue, NEW_PER_SET);
    takeFrom(earlierQueue, REVIEW_PER_SET);
    // Fill any gap from whichever pool still has items, then from the set's old items.
    while (chosen.length < QUIZ_LENGTH && (newLevelQueue.length || earlierQueue.length)) {
      chosen.push(newLevelQueue.length ? newLevelQueue.shift()! : earlierQueue.shift()!);
    }
    for (const old of JSON.parse(set.itemIds) as number[]) {
      if (chosen.length >= QUIZ_LENGTH) break;
      if (!chosen.includes(old)) chosen.push(old);
    }
    await prisma.quizSet.update({ where: { id: set.id }, data: { itemIds: JSON.stringify(chosen), builtForMaxLevel: newLevelId } });
  }
}

// ---------------------------------------------------------------------------------------------
// Starting, answering and finishing a quiz
// ---------------------------------------------------------------------------------------------

export type QuizOption = { itemId: number; kana: string; romaji: string; english: string };
export type QuizQuestionView = {
  index: number;
  type: "listen" | "phrase";
  tag: string | null;
  audioText: string; // what the listening question plays; the answer is not in here
  englishPrompt: string; // shown on "see the English" questions
  options: QuizOption[];
};
export type StartedQuiz = { attemptId: number; kind: QuizKind; title: string; setNo: number | null; level: number | null; questions: QuizQuestionView[] };

export async function startQuiz(userId: number, kind: QuizKind, params: { setNo?: number; level?: number }): Promise<StartedQuiz> {
  const levels = await unlockedLevelIds(userId);
  let quizItems: QuizItem[];
  let pool: QuizItem[];
  let title: string;
  let quizSetId: number | null = null;
  let targetLevel: number | null = null;
  let setNo: number | null = null;
  const tags = new Map<number, string>();

  if (kind === "daily") {
    setNo = params.setNo && params.setNo >= 1 && params.setNo <= QUIZ_SETS_PER_DAY ? params.setNo : 1;
    const sets = await ensureQuizSets(userId);
    const set = sets.find((s) => s.setNo === setNo);
    if (!set) throw new RuleError("Quiz not found.", 404);
    quizSetId = set.id;
    const wanted = JSON.parse(set.itemIds) as number[];
    pool = await itemsOfLevels(levels);
    const byId = new Map((await itemsByIds(wanted)).map((i) => [i.id, i]));
    quizItems = wanted.map((id) => byId.get(id)).filter((i): i is QuizItem => Boolean(i));
    title = setNo === 1 ? "Daily quiz" : `Practice set ${setNo}`;

    // "Review" for an item answered on an earlier day; "New from Level N" for unseen items above Level 1.
    const startOfToday = dateOnly(istDateString());
    const reviewRows = await prisma.userItemReview.findMany({ where: { userId, itemId: { in: wanted } } });
    const learnedRows = await prisma.userItem.findMany({ where: { userId, learnedAt: { not: null }, itemId: { in: wanted } }, select: { itemId: true } });
    const learned = new Set(learnedRows.map((r) => r.itemId));
    const reviewedEarlier = new Set(reviewRows.filter((r) => r.lastAnsweredAt < startOfToday).map((r) => r.itemId));
    for (const item of quizItems) {
      if (reviewedEarlier.has(item.id)) tags.set(item.id, "Review");
      else if (item.levelId > 1 && !learned.has(item.id) && !reviewRows.some((r) => r.itemId === item.id)) tags.set(item.id, `New from Level ${item.levelId}`);
    }
  } else if (kind === "unlock") {
    const level = params.level ?? 0;
    if (!Number.isInteger(level) || level < 2 || level > 5) throw new RuleError("Level not found.", 404);
    const exists = await prisma.level.findFirst({ where: { id: level, status: "published" } });
    if (!exists) throw new RuleError("Level not found.", 404);
    if (levels.includes(level)) throw new RuleError("That level is already open.");
    targetLevel = level;
    pool = await itemsOfLevels(Array.from({ length: level - 1 }, (_, i) => i + 1));
    quizItems = shuffle(pool).slice(0, QUIZ_LENGTH);
    title = `Unlock Level ${level}`;
  } else {
    const level = params.level ?? 0;
    if (!levels.includes(level)) throw new RuleError("That level is still locked.");
    targetLevel = level;
    const own = await itemsOfLevels([level]);
    const learnedRows = await prisma.userItem.findMany({ where: { userId, learnedAt: { not: null }, itemId: { in: own.map((i) => i.id) } }, select: { itemId: true } });
    const learned = new Set(learnedRows.map((r) => r.itemId));
    quizItems = [...shuffle(own.filter((i) => learned.has(i.id))), ...shuffle(own.filter((i) => !learned.has(i.id)))].slice(0, QUIZ_LENGTH);
    pool = await itemsOfLevels(levels.filter((l) => l <= level));
    title = `Level ${level} quiz`;
  }

  if (quizItems.length < QUIZ_LENGTH) throw new RuleError("Not enough content for a quiz yet.");

  const defs = buildQuestions(quizItems, pool);
  const stored: StoredAnswers = { questions: defs.map((d) => ({ ...d, tag: tags.get(d.itemId) ?? null })) };
  const attempt = await prisma.quizAttempt.create({
    data: { userId, kind, quizSetId, targetLevel, answers: JSON.stringify(stored), score: 0 },
  });

  const lookup = new Map([...pool, ...quizItems].map((i) => [i.id, i]));
  const questions: QuizQuestionView[] = stored.questions.map((q, index) => {
    const correct = lookup.get(q.itemId)!;
    return {
      index,
      type: q.type,
      tag: q.tag,
      audioText: correct.kana,
      englishPrompt: correct.english,
      options: q.options.map((id) => {
        const o = lookup.get(id)!;
        return { itemId: o.id, kana: o.kana, romaji: o.romaji, english: o.english };
      }),
    };
  });
  return { attemptId: attempt.id, kind, title, setNo, level: targetLevel, questions };
}

async function itemsByIds(ids: number[]): Promise<QuizItem[]> {
  const rows = await prisma.item.findMany({ where: { id: { in: ids } }, include: { set: { select: { levelId: true } } } });
  return rows.map(toQuizItem);
}

export type AnswerResult = { correct: boolean; item: QuizOption };

/** Stores one answer (the first one only) and moves the item's review date. */
export async function recordAnswer(userId: number, attemptId: number, index: number, chosen: number): Promise<AnswerResult> {
  const attempt = await prisma.quizAttempt.findFirst({ where: { id: attemptId, userId } });
  if (!attempt) throw new RuleError("Quiz not found.", 404);
  if (attempt.completedAt) throw new RuleError("This quiz is already finished.");
  const data = JSON.parse(attempt.answers) as StoredAnswers;
  const question = data.questions[index];
  if (!question) throw new RuleError("Question not found.", 404);
  if (!question.options.includes(chosen)) throw new RuleError("That is not one of the options.");

  const item = (await itemsByIds([question.itemId]))[0];
  const view: QuizOption = { itemId: item.id, kana: item.kana, romaji: item.romaji, english: item.english };
  if (question.chosen !== undefined) return { correct: Boolean(question.correct), item: view };

  const correct = chosen === question.itemId;
  question.chosen = chosen;
  question.correct = correct;

  // Claim the answer slot first so a double tap cannot move the review date twice.
  const claimed = await prisma.quizAttempt.updateMany({
    where: { id: attemptId, userId, completedAt: null, answers: attempt.answers },
    data: { answers: JSON.stringify(data) },
  });
  if (claimed.count !== 1) {
    const fresh = JSON.parse((await prisma.quizAttempt.findUniqueOrThrow({ where: { id: attemptId } })).answers) as StoredAnswers;
    return { correct: Boolean(fresh.questions[index].correct), item: view };
  }

  const previous = await prisma.userItemReview.findUnique({ where: { userId_itemId: { userId, itemId: question.itemId } } });
  const { step, days } = nextReviewState(previous ? previous.step : null, correct);
  const now = new Date();
  const dueDate = dateOnly(addDays(istDateString(now), days));
  await prisma.userItemReview.upsert({
    where: { userId_itemId: { userId, itemId: question.itemId } },
    create: { userId, itemId: question.itemId, step, dueDate, lastResult: correct, lastAnsweredAt: now },
    update: { step, dueDate, lastResult: correct, lastAnsweredAt: now },
  });
  await prisma.userItem.upsert({
    where: { userId_itemId: { userId, itemId: question.itemId } },
    create: { userId, itemId: question.itemId },
    update: { lastSeenAt: now },
  });
  await prisma.studyEvent.create({ data: { userId, type: "quiz", itemId: question.itemId, localDate: dateOnly(istDateString(now)) } });
  return { correct, item: view };
}

export type QuizSummary = {
  kind: QuizKind;
  score: number;
  total: number;
  pointsAwarded: number;
  bonus: number;
  passed: boolean | null; // unlock quizzes only
  unlockedLevel: number | null;
  firstDailyOfDay: boolean;
  goalJustMet: boolean;
  streak: number | null;
  setNo: number | null;
  nextSetNo: number | null;
  level: number | null;
};

export async function completeQuiz(userId: number, attemptId: number): Promise<QuizSummary> {
  const attempt = await prisma.quizAttempt.findFirst({ where: { id: attemptId, userId }, include: { quizSet: true } });
  if (!attempt) throw new RuleError("Quiz not found.", 404);
  const data = JSON.parse(attempt.answers) as StoredAnswers;
  const kind = attempt.kind as QuizKind;
  const setNo = attempt.quizSet?.setNo ?? null;
  const base = {
    kind,
    total: data.questions.length,
    setNo,
    nextSetNo: setNo ? (setNo % QUIZ_SETS_PER_DAY) + 1 : null,
    level: attempt.targetLevel,
  };

  if (data.questions.some((q) => q.chosen === undefined)) throw new RuleError("Answer every question first.");
  const score = data.questions.filter((q) => q.correct).length;

  // Finish exactly once. A repeat call gets the stored result back.
  const claimed = await prisma.quizAttempt.updateMany({
    where: { id: attemptId, userId, completedAt: null },
    data: { completedAt: new Date(), score },
  });
  if (claimed.count !== 1) {
    return {
      ...base,
      score: attempt.score,
      pointsAwarded: attempt.pointsAwarded,
      bonus: 0,
      passed: kind === "unlock" ? attempt.score >= UNLOCK_PASS_MARK : null,
      unlockedLevel: null,
      firstDailyOfDay: false,
      goalJustMet: false,
      streak: null,
    };
  }

  const today = istDateString();
  let pointsAwarded = 0;
  let bonus = 0;
  let passed: boolean | null = null;
  let unlockedLevel: number | null = null;
  let firstDailyOfDay = false;
  let goalJustMet = false;
  let streak: number | null = null;

  if (kind === "daily" && setNo === 1) {
    // Points and the goal count only for the first completed daily quiz of the day.
    const refKey = `daily:${today}`;
    const already = await prisma.pointsLedger.findUnique({ where: { userId_reason_refKey: { userId, reason: "quiz", refKey } } });
    if (!already) {
      firstDailyOfDay = true;
      pointsAwarded = score * POINTS_PER_RIGHT_ANSWER;
      await prisma.pointsLedger.create({ data: { userId, delta: pointsAwarded, reason: "quiz", refKey, localDate: dateOnly(today) } });

      const activity = await prisma.dailyActivity.upsert({
        where: { userId_localDate: { userId, localDate: dateOnly(today) } },
        create: { userId, localDate: dateOnly(today), quizDone: true },
        update: { quizDone: true },
      });
      const qualified = dayQualifies(activity.itemsLearned, true);
      if (qualified && !activity.qualified) {
        goalJustMet = true;
        await prisma.dailyActivity.update({ where: { userId_localDate: { userId, localDate: dateOnly(today) } }, data: { qualified: true } });
      }
      streak = (await refreshStreak(userId)).current;
    }
  }

  if (kind === "unlock" && attempt.targetLevel) {
    passed = score >= UNLOCK_PASS_MARK;
    if (passed) {
      const target = attempt.targetLevel;
      // Opens the target and every level below it, without marking any of them finished.
      for (let level = 1; level <= target; level++) {
        await prisma.userLevel.upsert({
          where: { userId_levelId: { userId, levelId: level } },
          create: { userId, levelId: level, unlockedVia: "quiz" },
          update: {},
        });
      }
      unlockedLevel = target;
      pointsAwarded = score * POINTS_PER_RIGHT_ANSWER;
      bonus = UNLOCK_BONUS_POINTS;
      const refKey = `unlock:${target}`;
      const exists = await prisma.pointsLedger.findUnique({ where: { userId_reason_refKey: { userId, reason: "unlock", refKey } } });
      if (exists) {
        pointsAwarded = 0;
        bonus = 0;
      } else {
        await prisma.pointsLedger.create({ data: { userId, delta: pointsAwarded + bonus, reason: "unlock", refKey, localDate: dateOnly(today) } });
      }
      await rebuildUnansweredSets(userId, target);
    }
  }

  await prisma.quizAttempt.update({ where: { id: attemptId }, data: { pointsAwarded: pointsAwarded + bonus } });
  return { ...base, score, pointsAwarded: pointsAwarded + bonus, bonus, passed, unlockedLevel, firstDailyOfDay, goalJustMet, streak };
}

/**
 * Today's score on the daily quiz (set 1) for the Today screen: the most recent finished attempt, so a retake shows.
 * Points and ranking still come only from the first attempt of the day.
 */
export async function todaysDailyScore(userId: number): Promise<number | null> {
  const set = await prisma.quizSet.findUnique({ where: { userId_localDate_setNo: { userId, localDate: dateOnly(istDateString()), setNo: 1 } } });
  if (!set) return null;
  const latest = await prisma.quizAttempt.findFirst({
    where: { userId, kind: "daily", quizSetId: set.id, completedAt: { not: null } },
    orderBy: { completedAt: "desc" },
  });
  return latest ? latest.score : null;
}
