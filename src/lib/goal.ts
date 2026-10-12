// Daily goal rules (PRD 5.4). Pure functions, so the rules are easy to test.

import { GOAL_ITEMS, LEARNING_WEIGHT, QUIZ_WEIGHT } from "@/lib/config";

export { GOAL_ITEMS };

/** The goal ring: learning counts for 70%, the quiz for 30%. */
export function goalProgress(itemsLearnedToday: number, quizDone: boolean) {
  const learning = Math.min(itemsLearnedToday, GOAL_ITEMS) / GOAL_ITEMS;
  const percent = Math.round(learning * LEARNING_WEIGHT * 100 + (quizDone ? QUIZ_WEIGHT * 100 : 0));
  return { learning, percent };
}

/** A day qualifies when 5 items are learned and the daily quiz is done. */
export function dayQualifies(itemsLearnedToday: number, quizDone: boolean) {
  return itemsLearnedToday >= GOAL_ITEMS && quizDone;
}
