import "server-only";
import { prisma } from "@/lib/db";
import { ROLEPLAY_POINTS } from "@/lib/config";
import { RuleError } from "@/lib/learning";
import { openStates, tierOf } from "@/lib/roleplay-core";
import { dateOnly, istDateString } from "@/lib/time";

export type RoleplayRow = { id: number; order: number; title: string; scene: string; tier: string; completed: boolean; open: boolean };

/** The published role-plays in order, with this learner's progress. Only published content reaches learners. */
export async function listRoleplays(userId: number): Promise<RoleplayRow[]> {
  const [rows, done] = await Promise.all([
    prisma.roleplay.findMany({ where: { status: "published" }, orderBy: { order: "asc" } }),
    prisma.userRoleplay.findMany({ where: { userId }, select: { roleplayId: true } }),
  ]);
  const completed = new Set(done.map((d) => d.roleplayId));
  const open = openStates(rows.map((r) => r.id), completed);
  return rows.map((r) => ({
    id: r.id,
    order: r.order,
    title: r.title,
    scene: r.scene,
    tier: tierOf(r.order),
    completed: completed.has(r.id),
    open: open.get(r.id) ?? false,
  }));
}

export async function getRoleplay(userId: number, id: number) {
  const all = await listRoleplays(userId);
  const index = all.findIndex((r) => r.id === id);
  if (index < 0) return null;
  const row = all[index];
  const lines = await prisma.roleplayLine.findMany({ where: { roleplayId: id }, orderBy: { order: "asc" } });
  return {
    row,
    position: index + 1,
    total: all.length,
    nextId: all[index + 1]?.id ?? null,
    lines: lines.map((l) => ({ id: l.id, speaker: l.speaker, kana: l.kana, romaji: l.romaji, english: l.english })),
  };
}

export type CompleteResult = { firstTime: boolean; points: number; nextId: number | null };

/** Marks a role-play complete. The first completion awards 30 points once (FR-P6); the next one opens. */
export async function completeRoleplay(userId: number, id: number): Promise<CompleteResult> {
  const all = await listRoleplays(userId);
  const index = all.findIndex((r) => r.id === id);
  if (index < 0) throw new RuleError("Role-play not found.", 404);
  if (!all[index].open) throw new RuleError("Finish the one before to open this.");

  const nextId = all[index + 1]?.id ?? null;
  const already = await prisma.userRoleplay.findUnique({ where: { userId_roleplayId: { userId, roleplayId: id } } });
  if (already) return { firstTime: false, points: 0, nextId };

  const today = istDateString();
  try {
    await prisma.userRoleplay.create({ data: { userId, roleplayId: id } });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return { firstTime: false, points: 0, nextId };
    throw error;
  }
  await prisma.pointsLedger.create({
    data: { userId, delta: ROLEPLAY_POINTS, reason: "roleplay", refKey: `roleplay:${id}`, localDate: dateOnly(today) },
  });
  await prisma.studyEvent.create({ data: { userId, type: "roleplay", localDate: dateOnly(today) } });
  return { firstTime: true, points: ROLEPLAY_POINTS, nextId };
}
