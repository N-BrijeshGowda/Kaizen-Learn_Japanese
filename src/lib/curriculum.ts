import "server-only";
import { prisma } from "@/lib/db";
import { ensureStartLevel } from "@/lib/learning";

export type Part = { kana: string; romaji: string; meaning: string };

export type ItemView = {
  id: number;
  order: number;
  kana: string;
  romaji: string;
  english: string;
  note: string;
  parts: Part[] | null;
  learned: boolean;
};

export type SetView = {
  id: number;
  order: number;
  name: string;
  items: ItemView[];
  learned: number;
  finished: boolean;
  open: boolean;
};

export type LevelView = {
  id: number;
  name: string;
  kind: "word" | "phrase" | "sentence";
  subtitle: string;
  unlocked: boolean;
  completed: boolean;
  learned: number;
  total: number;
  sets: SetView[];
};

export function parseParts(text: string | null): Part[] | null {
  if (!text) return null;
  try {
    const raw = JSON.parse(text) as unknown;
    if (!Array.isArray(raw)) return null;
    const parts = raw
      .filter((p): p is string[] => Array.isArray(p) && p.length >= 3)
      .map(([kana, romaji, meaning]) => ({ kana, romaji, meaning }));
    return parts.length ? parts : null;
  } catch {
    return null;
  }
}

export const kindNoun = (kind: LevelView["kind"], plural = true) =>
  ({ word: plural ? "words" : "word", phrase: plural ? "phrases" : "phrase", sentence: plural ? "sentences" : "sentence" })[kind];

export const kindLabel = (kind: LevelView["kind"]) => ({ word: "Word", phrase: "Phrase", sentence: "Sentence" })[kind];

/** The whole published curriculum with this learner's progress laid over it (125 items, small). */
export async function getCurriculum(userId: number): Promise<LevelView[]> {
  await ensureStartLevel(userId);
  const [levels, learnedRows, userLevels] = await Promise.all([
    prisma.level.findMany({
      where: { status: "published" },
      orderBy: { id: "asc" },
      include: { sets: { orderBy: { order: "asc" }, include: { items: { orderBy: { order: "asc" } } } } },
    }),
    prisma.userItem.findMany({ where: { userId, learnedAt: { not: null } }, select: { itemId: true } }),
    prisma.userLevel.findMany({ where: { userId } }),
  ]);

  const learnedIds = new Set(learnedRows.map((r) => r.itemId));
  const unlockedMap = new Map(userLevels.map((u) => [u.levelId, u]));

  return levels.map((level) => {
    let previousFinished = true;
    const sets: SetView[] = level.sets.map((set) => {
      const items: ItemView[] = set.items.map((item) => ({
        id: item.id,
        order: item.order,
        kana: item.kana,
        romaji: item.romaji,
        english: item.english,
        note: item.note,
        parts: parseParts(item.parts),
        learned: learnedIds.has(item.id),
      }));
      const learned = items.filter((i) => i.learned).length;
      const finished = items.length > 0 && learned === items.length;
      const view: SetView = { id: set.id, order: set.order, name: set.name, items, learned, finished, open: previousFinished };
      previousFinished = finished;
      return view;
    });
    const learned = sets.reduce((n, s) => n + s.learned, 0);
    const total = sets.reduce((n, s) => n + s.items.length, 0);
    const row = unlockedMap.get(level.id);
    return {
      id: level.id,
      name: level.name,
      kind: level.kind,
      subtitle: level.subtitle,
      unlocked: Boolean(row),
      completed: Boolean(row?.completedAt) || (total > 0 && learned === total),
      learned,
      total,
      sets,
    };
  });
}

/** The lowest unlocked level not yet finished, with its first unfinished set. Null when everything is done. */
export function findCurrent(levels: LevelView[]) {
  const level = levels.find((l) => l.unlocked && !l.completed);
  if (!level) return null;
  const set = level.sets.find((s) => s.open && !s.finished) ?? level.sets[0];
  const nextItemIndex = Math.max(0, set.items.findIndex((i) => !i.learned));
  return { level, set, nextItemIndex };
}

export const highestUnlocked = (levels: LevelView[]) =>
  levels.reduce((max, l) => (l.unlocked ? Math.max(max, l.id) : max), 1);
