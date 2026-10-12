import { describe, expect, it } from "vitest";
import { dayQualifies, goalProgress } from "@/lib/goal";

describe("goal ring", () => {
  it("is empty at the start of the day", () => {
    expect(goalProgress(0, false).percent).toBe(0);
  });

  it("counts learning for 70% and the quiz for 30%", () => {
    expect(goalProgress(5, false).percent).toBe(70);
    expect(goalProgress(0, true).percent).toBe(30);
    expect(goalProgress(5, true).percent).toBe(100);
  });

  it("fills in proportion to items learned", () => {
    expect(goalProgress(2, false).percent).toBe(28);
    expect(goalProgress(3, true).percent).toBe(72);
  });

  it("does not go past 70% for learning, however many items are learned", () => {
    expect(goalProgress(12, false).percent).toBe(70);
  });
});

describe("qualifying day", () => {
  it("needs both 5 items and the quiz", () => {
    expect(dayQualifies(5, true)).toBe(true);
    expect(dayQualifies(4, true)).toBe(false);
    expect(dayQualifies(5, false)).toBe(false);
    expect(dayQualifies(9, true)).toBe(true);
  });
});
