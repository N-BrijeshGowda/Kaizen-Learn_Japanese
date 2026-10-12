import "server-only";
import { prisma } from "@/lib/db";
import { toCsv } from "@/lib/csv";
import { addDays, dateOnly, istDateString } from "@/lib/time";

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Admin actions are logged with who and when (FR-D7). */
export async function audit(actorId: number, action: string, target: string) {
  await prisma.auditLog.create({ data: { actorId, action: action.slice(0, 80), target: target.slice(0, 120) } });
}

export async function searchUsers(query: string) {
  const q = query.trim();
  return prisma.user.findMany({
    where: q ? { OR: [{ email: { contains: q } }, { name: { contains: q } }] } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true, onboardedAt: true },
  });
}

export type ParticipationRow = {
  id: number;
  name: string;
  email: string;
  role: string;
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
  points: number;
  level: number;
  quizAverage: number | null;
};

/** Participation counts only: no recordings and no per-question mistakes (FR-D3). */
export async function participation() {
  const today = istDateString();
  const [users, activeDays, streaks, points, levels, quizAvg, activated, recent, wrongItems, wrongLines, roleplaysDone] = await Promise.all([
    prisma.user.findMany({ where: { status: "active" }, select: { id: true, name: true, email: true, role: true } }),
    prisma.dailyActivity.groupBy({ by: ["userId"], where: { OR: [{ itemsLearned: { gt: 0 } }, { quizDone: true }] }, _count: { _all: true } }),
    prisma.streak.findMany(),
    prisma.pointsLedger.groupBy({ by: ["userId"], _sum: { delta: true } }),
    prisma.userLevel.groupBy({ by: ["userId"], _max: { levelId: true } }),
    prisma.quizAttempt.groupBy({
      by: ["userId"],
      where: { kind: "daily", completedAt: { not: null }, quizSet: { setNo: 1 } },
      _avg: { score: true },
    }),
    prisma.dailyActivity.groupBy({ by: ["userId"], where: { qualified: true }, _count: { _all: true } }),
    prisma.studyEvent.findMany({ where: { localDate: { gte: dateOnly(addDays(today, -6)) } }, distinct: ["userId"], select: { userId: true } }),
    prisma.item.count({ where: { reviewStatus: "wrong" } }),
    prisma.roleplayLine.count({ where: { reviewStatus: "wrong" } }),
    prisma.userRoleplay.count(),
  ]);

  const by = <T extends { userId: number }>(rows: T[]) => new Map(rows.map((r) => [r.userId, r]));
  const daysBy = by(activeDays);
  const streakBy = by(streaks);
  const pointsBy = by(points);
  const levelBy = by(levels);
  const quizBy = by(quizAvg);

  const rows: ParticipationRow[] = users
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      activeDays: daysBy.get(u.id)?._count._all ?? 0,
      currentStreak: streakBy.get(u.id)?.current ?? 0,
      longestStreak: streakBy.get(u.id)?.longest ?? 0,
      points: pointsBy.get(u.id)?._sum.delta ?? 0,
      level: levelBy.get(u.id)?._max.levelId ?? 1,
      quizAverage: quizBy.get(u.id)?._avg.score ?? null,
    }))
    .sort((a, b) => b.points - a.points);

  const scored = rows.filter((r) => r.quizAverage !== null);
  return {
    rows,
    totals: {
      learners: users.length,
      activated: activated.length,
      activeLast7Days: recent.length,
      quizAverage: scored.length ? scored.reduce((n, r) => n + (r.quizAverage ?? 0), 0) / scored.length : null,
      roleplaysCompleted: roleplaysDone,
      flaggedWrong: wrongItems + wrongLines,
    },
  };
}

/** Pilot export, one row per learner per day (PRD 15). */
export async function dailyMetricsCsv(): Promise<string> {
  const [activity, users, attempts, ledger, levels, roleplays] = await Promise.all([
    prisma.dailyActivity.findMany({ orderBy: [{ userId: "asc" }, { localDate: "asc" }] }),
    prisma.user.findMany({ select: { id: true, name: true } }),
    prisma.quizAttempt.findMany({
      where: { kind: "daily", completedAt: { not: null }, quizSet: { setNo: 1 } },
      orderBy: { completedAt: "asc" },
      select: { userId: true, score: true, quizSet: { select: { localDate: true } } },
    }),
    prisma.pointsLedger.groupBy({ by: ["userId", "localDate"], _sum: { delta: true } }),
    prisma.userLevel.findMany({ select: { userId: true, levelId: true, unlockedAt: true } }),
    prisma.userRoleplay.findMany({ select: { userId: true, completedAt: true } }),
  ]);

  const name = new Map(users.map((u) => [u.id, u.name]));
  const score = new Map<string, number>();
  for (const a of attempts) {
    const key = `${a.userId}|${iso(a.quizSet!.localDate)}`;
    if (!score.has(key)) score.set(key, a.score); // the first completed daily quiz of the day is the one that counts
  }
  const points = new Map(ledger.map((l) => [`${l.userId}|${iso(l.localDate)}`, l._sum.delta ?? 0]));
  const rpCount = new Map<string, number>();
  for (const r of roleplays) {
    const key = `${r.userId}|${istDateString(r.completedAt)}`;
    rpCount.set(key, (rpCount.get(key) ?? 0) + 1);
  }
  const unlocks = new Map<number, { day: string; level: number }[]>();
  for (const l of levels) unlocks.set(l.userId, [...(unlocks.get(l.userId) ?? []), { day: istDateString(l.unlockedAt), level: l.levelId }]);

  const rows = activity.map((a) => {
    const day = iso(a.localDate);
    const key = `${a.userId}|${day}`;
    const reached = Math.max(1, ...(unlocks.get(a.userId) ?? []).filter((u) => u.day <= day).map((u) => u.level));
    return [a.userId, name.get(a.userId) ?? "", day, a.itemsLearned, a.quizDone, score.get(key) ?? null, a.qualified, a.restUsed, points.get(key) ?? 0, reached, rpCount.get(key) ?? 0];
  });
  return toCsv(
    ["user_id", "name", "date", "items_learned", "quiz_done", "quiz_score", "goal_met", "rest_day", "points_earned", "level_reached", "roleplays_completed"],
    rows,
  );
}

/** One row per learner: streaks, points and the date each level was finished. */
export async function summaryMetricsCsv(): Promise<string> {
  const [users, streaks, points, levels, roleplays] = await Promise.all([
    prisma.user.findMany({ orderBy: { id: "asc" }, select: { id: true, name: true, role: true, status: true, createdAt: true } }),
    prisma.streak.findMany(),
    prisma.pointsLedger.groupBy({ by: ["userId"], _sum: { delta: true } }),
    prisma.userLevel.findMany(),
    prisma.userRoleplay.groupBy({ by: ["userId"], _count: { _all: true } }),
  ]);
  const streakBy = new Map(streaks.map((s) => [s.userId, s]));
  const pointsBy = new Map(points.map((p) => [p.userId, p._sum.delta ?? 0]));
  const rpBy = new Map(roleplays.map((r) => [r.userId, r._count._all]));

  const rows = users.map((u) => {
    const mine = levels.filter((l) => l.userId === u.id);
    const completed = (level: number) => {
      const row = mine.find((l) => l.levelId === level);
      return row?.completedAt ? istDateString(row.completedAt) : null;
    };
    return [
      u.id, u.name, u.role, u.status, istDateString(u.createdAt),
      streakBy.get(u.id)?.current ?? 0, streakBy.get(u.id)?.longest ?? 0,
      pointsBy.get(u.id) ?? 0, Math.max(1, ...mine.map((l) => l.levelId)),
      completed(1), completed(2), completed(3), completed(4), completed(5),
      rpBy.get(u.id) ?? 0,
    ];
  });
  return toCsv(
    ["user_id", "name", "role", "status", "joined", "current_streak", "longest_streak", "points", "level_reached", "level1_finished", "level2_finished", "level3_finished", "level4_finished", "level5_finished", "roleplays_completed"],
    rows,
  );
}
