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
