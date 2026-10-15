// Role-play rules (PRD 7.9). Pure, so they are unit tested.

export const TIERS = ["Starter", "Easy", "Medium", "Challenge"] as const;
export const TIER_SIZE = 6;

/** Tier comes from the position: role-plays 1 to 6 are Starter, 7 to 12 Easy, 13 to 18 Medium, 19 to 24 Challenge. */
export function tierOf(order: number): (typeof TIERS)[number] {
  return TIERS[Math.min(TIERS.length - 1, Math.max(0, Math.floor((order - 1) / TIER_SIZE)))];
}

/**
 * Role-play 1 is open; each next one opens when the one before it is marked complete.
 * `orderedIds` are the published role-plays in order.
 */
export function openStates(orderedIds: readonly number[], completed: ReadonlySet<number>): Map<number, boolean> {
  const open = new Map<number, boolean>();
  orderedIds.forEach((id, index) => open.set(id, index === 0 || completed.has(orderedIds[index - 1])));
  return open;
}

/** How long "Practise my part" waits for the learner to speak (FR-P4). */
export const YOUR_TURN_MS = 4500;

/** Lower-cases, turns katakana into hiragana and drops spaces and punctuation so spoken text can be compared with a script line. */
export function normalizeJa(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/[\s\p{P}\p{S}]/gu, "")
    .toLowerCase();
}

/** 0 to 1: how alike two Japanese strings are, by edit distance after normalising. */
export function similarity(a: string, b: string): number {
  const x = normalizeJa(a);
  const y = normalizeJa(b);
  if (!x.length && !y.length) return 1;
  if (!x.length || !y.length) return 0;
  let prev = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    const row = [i];
    for (let j = 1; j <= y.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return 1 - prev[y.length] / Math.max(x.length, y.length);
}

/** A spoken line counts as right when it is close enough to the script; speech recognition is rarely letter perfect. */
export const MATCH_THRESHOLD = 0.8;
export const isMatch = (heard: string, expected: string) => similarity(heard, expected) >= MATCH_THRESHOLD;
