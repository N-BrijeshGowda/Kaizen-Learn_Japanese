// Ranking rules (PRD 7.12). Pure, so ties and the "top 20 plus my own row" view are unit tested.

export type RankInput = {
  userId: number;
  name: string;
  level: number;
  points: number;
  /** When the learner reached their current total (time of their latest points), or when they joined if they have none. */
  reachedAt: number;
};
export type Ranked = RankInput & { rank: number };

/** Most points first. Equal points: whoever reached that score first ranks higher (FR-M5). */
export function rankLearners(rows: readonly RankInput[]): Ranked[] {
  return [...rows]
    .sort((a, b) => b.points - a.points || a.reachedAt - b.reachedAt || a.userId - b.userId)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

/** The top `limit`, plus the viewer's own row if they are outside it (FR-M3). */
export function visibleRows(ranked: readonly Ranked[], viewerId: number, limit = 20): { top: Ranked[]; me: Ranked | null } {
  const top = ranked.slice(0, limit);
  const me = ranked.find((r) => r.userId === viewerId) ?? null;
  return { top, me: me && me.rank > limit ? me : null };
}
