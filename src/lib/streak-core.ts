// Streak and rest-day rules (PRD 5.4). Pure: it only needs the set of qualifying days and today's IST date,
// so a streak can always be recomputed from the activity records (FR-G6).
import { addDays, istWeekStart } from "@/lib/time";

export type StreakResult = {
  current: number;
  longest: number;
  lastQualified: string | null;
  /** Days a weekly rest day protected the streak. */
  restDays: Set<string>;
  /** Mondays of the weeks whose rest day is used. */
  restWeeks: Set<string>;
};

/**
 * Walks every day from the first qualifying day to today.
 * - A qualifying day adds one to the streak.
 * - A missed day is a rest day (streak holds) if the day before it qualified and that calendar week
 *   (Monday start) has not used its rest day. Otherwise the streak drops to 0.
 * - Today is never counted as missed: it is still open.
 * Two missed days in a row always break the streak, because the second one follows a rest day, not a goal day.
 */
export function computeStreak(qualified: ReadonlySet<string>, today: string): StreakResult {
  const result: StreakResult = { current: 0, longest: 0, lastQualified: null, restDays: new Set(), restWeeks: new Set() };
  if (qualified.size === 0) return result;

  let day = [...qualified].sort()[0];
  let previous: "met" | "rest" | "miss" = "miss";

  while (day <= today) {
    if (qualified.has(day)) {
      result.current += 1;
      result.longest = Math.max(result.longest, result.current);
      result.lastQualified = day;
      previous = "met";
    } else if (day !== today) {
      const week = istWeekStart(day);
      if (result.current > 0 && previous === "met" && !result.restWeeks.has(week)) {
        result.restDays.add(day);
        result.restWeeks.add(week);
        previous = "rest";
      } else {
        result.current = 0;
        previous = "miss";
      }
    }
    day = addDays(day, 1);
  }
  return result;
}

export type DayStatus = "met" | "rest" | "missed" | "open" | "future" | "before";

/** Calendar status of one day, for the Progress page. `joined` is the learner's first IST day. */
export function dayStatus(day: string, today: string, joined: string, qualified: ReadonlySet<string>, restDays: ReadonlySet<string>): DayStatus {
  if (day > today) return "future";
  if (day < joined) return "before";
  if (qualified.has(day)) return "met";
  if (restDays.has(day)) return "rest";
  return day === today ? "open" : "missed";
}
