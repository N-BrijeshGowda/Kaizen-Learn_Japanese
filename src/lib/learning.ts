import "server-only";
import { prisma } from "@/lib/db";
import { LEVEL_POINTS, SET_POINTS } from "@/lib/config";
import { dayQualifies } from "@/lib/goal";
import { dateOnly, istDateString } from "@/lib/time";
import type { Prisma } from "@/generated/prisma/client";

// Rules from PRD section 5. The server is the only authority on gating and points.


export type Award = { kind: "set" | "level"; points: number; levelId: number; setOrder?: number };

export class RuleError extends Error {
  constructor(message: string, readonly status: 403 | 404 = 403) {
    super(message);
  }
}

type Tx = Prisma.TransactionClient;

/** Every user has Level 1 open from the start. */
export async function ensureStartLevel(userId: number, tx: Tx | typeof prisma = prisma) {
  await tx.userLevel.upsert({
    where: { userId_levelId: { userId, levelId: 1 } },
    create: { userId, levelId: 1, unlockedVia: "start" },
    update: {},
  });
}

/** Adds a ledger row once. Returns true only the first time (the unique key stops repeats). */
async function awardOnce(
  tx: Tx,
  userId: number,
  reason: "set" | "level",
  refKey: string,
  delta: number,
  localDate: string,
): Promise<boolean> {
  const existing = await tx.pointsLedger.findUnique({
    where: { userId_reason_refKey: { userId, reason, refKey } },
  });
  if (existing) return false;
  await tx.pointsLedger.create({
    data: { userId, delta, reason, refKey, localDate: dateOnly(localDate) },
  });
  return true;
}

/** A set is open when it is the first in its level, or the set before it is finished. */
export async function isSetOpen(userId: number, levelId: number, setOrder: number, tx: Tx | typeof prisma = prisma) {
  if (setOrder <= 1) return true;
  const previous = await tx.learnSet.findUnique({
    where: { levelId_order: { levelId, order: setOrder - 1 } },
    include: { items: { select: { id: true } } },
  });
  if (!previous) return false;
  const learned = await tx.userItem.count({
    where: { userId, learnedAt: { not: null }, itemId: { in: previous.items.map((i) => i.id) } },
  });
  return learned >= previous.items.length;
}

export type LearnedResult = {
  learnedItemIds: number[]; // learned items in this set after the call
  setComplete: boolean;
  itemsLearnedToday: number;
  awards: Award[];
  unlockedLevelId: number | null;
  /** True when this tap completed the daily goal (5 items learned and the quiz done) for the first time today. */
  goalJustMet: boolean;
  /** Set by the caller after the streak is recomputed. */
  streak?: number | null;
};

/**
 * Marks an item learned (the learner tapped Next on it), then settles everything that follows:
 * the daily goal count, set and level completion, points, and opening the next level.
 */
export async function markItemLearned(userId: number, itemId: number): Promise<LearnedResult> {
  return prisma.$transaction(async (tx) => {
    const item = await tx.item.findUnique({
      where: { id: itemId },
      include: { set: { include: { level: true, items: { select: { id: true } } } } },
    });
    if (!item || item.set.level.status !== "published") throw new RuleError("Item not found", 404);

    const { set } = item;
    const levelId = set.levelId;

    await ensureStartLevel(userId, tx);
    const unlocked = await tx.userLevel.findUnique({ where: { userId_levelId: { userId, levelId } } });
    if (!unlocked) throw new RuleError("This level is still locked.");
    if (!(await isSetOpen(userId, levelId, set.order, tx))) throw new RuleError("Finish the set before this one first.");

    const now = new Date();
    const today = istDateString(now);

    await tx.userItem.upsert({
      where: { userId_itemId: { userId, itemId } },
      create: { userId, itemId, learnedAt: now, lastSeenAt: now },
      update: { lastSeenAt: now },
    });
    // learnedAt is only set the first time.
    await tx.userItem.updateMany({
      where: { userId, itemId, learnedAt: null },
      data: { learnedAt: now },
    });

    await tx.studyEvent.create({
      data: { userId, type: "learn", itemId, localDate: dateOnly(today) },
    });

    // Goal count: distinct items the learner tapped Next on today.
    const distinct = await tx.studyEvent.findMany({
      where: { userId, type: "learn", localDate: dateOnly(today), itemId: { not: null } },
      distinct: ["itemId"],
      select: { itemId: true },
    });
    const itemsLearnedToday = distinct.length;

    const activity = await tx.dailyActivity.upsert({
      where: { userId_localDate: { userId, localDate: dateOnly(today) } },
      create: { userId, localDate: dateOnly(today), itemsLearned: itemsLearnedToday },
      update: { itemsLearned: itemsLearnedToday },
    });
    const qualified = dayQualifies(itemsLearnedToday, activity.quizDone);
    const goalJustMet = qualified && !activity.qualified;
    if (qualified !== activity.qualified) {
      await tx.dailyActivity.update({
        where: { userId_localDate: { userId, localDate: dateOnly(today) } },
        data: { qualified },
      });
    }

    // Set completion
    const setItemIds = set.items.map((i) => i.id);
    const learnedRows = await tx.userItem.findMany({
      where: { userId, learnedAt: { not: null }, itemId: { in: setItemIds } },
      select: { itemId: true },
    });
    const learnedItemIds = learnedRows.map((r) => r.itemId);
    const setComplete = learnedItemIds.length >= setItemIds.length;

    const awards: Award[] = [];
    let unlockedLevelId: number | null = null;

    if (setComplete) {
      if (await awardOnce(tx, userId, "set", `set:${set.id}`, SET_POINTS, today)) {
        awards.push({ kind: "set", points: SET_POINTS, levelId, setOrder: set.order });
      }

      // Level completion: every set in the level has all its items learned.
      const levelSets = await tx.learnSet.findMany({
        where: { levelId },
        include: { items: { select: { id: true } } },
      });
      const allItemIds = levelSets.flatMap((s) => s.items.map((i) => i.id));
      const learnedInLevel = await tx.userItem.count({
        where: { userId, learnedAt: { not: null }, itemId: { in: allItemIds } },
      });
      if (learnedInLevel >= allItemIds.length) {
        await tx.userLevel.updateMany({
          where: { userId, levelId, completedAt: null },
          data: { completedAt: now },
        });
        if (await awardOnce(tx, userId, "level", `level:${levelId}`, LEVEL_POINTS, today)) {
          awards.push({ kind: "level", points: LEVEL_POINTS, levelId });
        }
        const next = await tx.level.findUnique({ where: { id: levelId + 1 } });
        if (next && next.status === "published") {
          const had = await tx.userLevel.findUnique({
            where: { userId_levelId: { userId, levelId: next.id } },
          });
          if (!had) {
            await tx.userLevel.create({ data: { userId, levelId: next.id, unlockedVia: "progress" } });
            unlockedLevelId = next.id;
          }
        }
      }
    }

    return { learnedItemIds, setComplete, itemsLearnedToday, awards, unlockedLevelId, goalJustMet };
  });
}

/** Total points: the sum of the ledger. */
export async function totalPoints(userId: number): Promise<number> {
  const sum = await prisma.pointsLedger.aggregate({ where: { userId }, _sum: { delta: true } });
  return sum._sum.delta ?? 0;
}
