import "server-only";
import { prisma } from "@/lib/db";
import { rankLearners, visibleRows, type RankInput } from "@/lib/ranking-core";

/** Every active learner ranked by points (FR-M1). Only display name, level and points leave this function, never email. */
export async function getRanking(viewerId: number) {
  const [users, sums, levels] = await Promise.all([
    prisma.user.findMany({ where: { status: "active", onboardedAt: { not: null } }, select: { id: true, name: true, createdAt: true } }),
    prisma.pointsLedger.groupBy({ by: ["userId"], _sum: { delta: true }, _max: { createdAt: true } }),
    prisma.userLevel.groupBy({ by: ["userId"], _max: { levelId: true } }),
  ]);
  const pointsBy = new Map(sums.map((s) => [s.userId, s]));
  const levelBy = new Map(levels.map((l) => [l.userId, l._max.levelId ?? 1]));

  const rows: RankInput[] = users.map((u) => {
    const s = pointsBy.get(u.id);
    return {
      userId: u.id,
      name: u.name,
      level: levelBy.get(u.id) ?? 1,
      points: s?._sum.delta ?? 0,
      reachedAt: (s?._max.createdAt ?? u.createdAt).getTime(),
    };
  });
  const ranked = rankLearners(rows);
  return { ...visibleRows(ranked, viewerId, 20), total: ranked.length };
}
