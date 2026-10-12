import "server-only";
import { prisma } from "@/lib/db";
import { computeStreak } from "@/lib/streak-core";
import { dateOnly, istDateString, istWeekStart } from "@/lib/time";

const iso = (d: Date) => d.toISOString().slice(0, 10);

export type StreakState = {
  current: number;
  longest: number;
  lastQualified: string | null;
  restUsedThisWeek: boolean;
  qualified: Set<string>;
  restDays: Set<string>;
  /** Rest days the computation found that are not stored yet. */
  unsavedRestDays: string[];
};

/** Works out the streak from the activity records without writing anything. Safe to call while rendering a page. */
export async function readStreak(userId: number): Promise<StreakState> {
  const today = istDateString();
  const rows = await prisma.dailyActivity.findMany({
    where: { userId },
    select: { localDate: true, qualified: true, restUsed: true },
  });
  const qualified = new Set(rows.filter((r) => r.qualified).map((r) => iso(r.localDate)));
  const marked = new Set(rows.filter((r) => r.restUsed).map((r) => iso(r.localDate)));
  const result = computeStreak(qualified, today);
  const stored = await prisma.streak.findUnique({ where: { userId } });

  return {
    current: result.current,
    longest: Math.max(stored?.longest ?? 0, result.longest),
    lastQualified: result.lastQualified,
    restUsedThisWeek: result.restWeeks.has(istWeekStart(today)),
    qualified,
    restDays: new Set([...result.restDays, ...marked]),
    unsavedRestDays: [...result.restDays].filter((d) => !marked.has(d)),
  };
}

/**
 * Recomputes the streak from the activity records (never from a running counter, so it cannot drift),
 * stores the result, and records which days a rest day covered.
 */
export async function refreshStreak(userId: number): Promise<StreakState> {
  const state = await readStreak(userId);
  const thisWeek = istWeekStart(istDateString());

  for (const day of state.unsavedRestDays) {
    await prisma.dailyActivity.upsert({
      where: { userId_localDate: { userId, localDate: dateOnly(day) } },
      create: { userId, localDate: dateOnly(day), restUsed: true },
      update: { restUsed: true },
    });
  }

  const values = {
    current: state.current,
    longest: state.longest,
    lastQualifiedDate: state.lastQualified ? dateOnly(state.lastQualified) : null,
    restWeek: state.restUsedThisWeek ? dateOnly(thisWeek) : null,
    restUsed: state.restUsedThisWeek,
  };
  await prisma.streak.upsert({ where: { userId }, create: { userId, ...values }, update: values });
  return { ...state, unsavedRestDays: [] };
}

/** The once-a-day job (just after midnight IST): settles the day that ended for every learner with activity. */
export async function rolloverAll(): Promise<{ users: number; date: string }> {
  const users = await prisma.dailyActivity.findMany({ distinct: ["userId"], select: { userId: true } });
  for (const { userId } of users) await refreshStreak(userId);
  return { users: users.length, date: istDateString() };
}
