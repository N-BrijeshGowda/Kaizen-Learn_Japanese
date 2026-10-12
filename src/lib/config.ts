// Tunable rules (PRD 5: "interval and point values live in configuration so the pilot can tune them").

/** Review steps in days. A right answer moves an item one step along; a wrong answer sends it back to the first. */
export const REVIEW_STEPS_DAYS = [1, 3, 7, 14, 30] as const;

export const QUIZ_LENGTH = 5;
export const QUIZ_SETS_PER_DAY = 5;
export const NEW_PER_SET = 3;
export const REVIEW_PER_SET = 2;

export const POINTS_PER_RIGHT_ANSWER = 10;
export const SET_POINTS = 10;
export const LEVEL_POINTS = 50;
export const ROLEPLAY_POINTS = 30;
export const UNLOCK_BONUS_POINTS = 25;
export const UNLOCK_PASS_MARK = 4;

export const GOAL_ITEMS = 5;
export const LEARNING_WEIGHT = 0.7;
export const QUIZ_WEIGHT = 0.3;
