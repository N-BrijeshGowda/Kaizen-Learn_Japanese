import { describe, expect, it } from "vitest";
import { computeStreak, dayStatus } from "@/lib/streak-core";

// Week of Monday 2026-10-05 to Sunday 2026-10-11, then Monday 2026-10-12.
const days = (...d: string[]) => new Set(d);

describe("streak", () => {
  it("is 0 with no activity", () => {
    expect(computeStreak(days(), "2026-10-08")).toMatchObject({ current: 0, longest: 0 });
  });

  it("counts consecutive qualifying days, including today", () => {
    const r = computeStreak(days("2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08"), "2026-10-08");
    expect(r.current).toBe(4);
    expect(r.longest).toBe(4);
    expect(r.lastQualified).toBe("2026-10-08");
  });

  it("does not break the streak just because today is not finished yet", () => {
    const r = computeStreak(days("2026-10-06", "2026-10-07"), "2026-10-08");
    expect(r.current).toBe(2);
    expect(r.restDays.size).toBe(0);
  });

  it("one missed day uses the weekly rest day and the streak holds", () => {
    const r = computeStreak(days("2026-10-05", "2026-10-06", "2026-10-08"), "2026-10-08");
    expect([...r.restDays]).toEqual(["2026-10-07"]);
    expect(r.current).toBe(3); // 5th, 6th, 8th: the rest day itself adds nothing
  });

  it("a second miss in the same week resets the streak (rest day already used)", () => {
    const r = computeStreak(days("2026-10-05", "2026-10-07", "2026-10-09"), "2026-10-09");
    // Tue 6th is the rest day; Thu 8th is missed again with no rest left, so the streak restarts at Fri 9th
    expect([...r.restDays]).toEqual(["2026-10-06"]);
    expect(r.current).toBe(1);
    expect(r.longest).toBe(2);
  });

  it("two missed days in a row always break it", () => {
    const r = computeStreak(days("2026-10-05", "2026-10-06", "2026-10-09"), "2026-10-09");
    expect(r.current).toBe(1);
    expect(r.longest).toBe(2);
  });

  it("an unused rest day does not carry over to the next week", () => {
    // Week 1 (5th to 11th) all met, so no rest used. Week 2 misses Tue 13th: that week's own rest day covers it.
    const r = computeStreak(
      days("2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11", "2026-10-12", "2026-10-14"),
      "2026-10-14",
    );
    expect([...r.restDays]).toEqual(["2026-10-13"]);
    expect(r.current).toBe(9);
  });

  it("the rest day is per calendar week, Monday start: a Sunday miss and a Monday miss are different weeks", () => {
    // Met Sat 10th; miss Sun 11th (rest, week of 5th); met Mon 12th; miss Tue 13th (rest, week of 12th)
    const r = computeStreak(days("2026-10-10", "2026-10-12", "2026-10-14"), "2026-10-14");
    expect([...r.restDays].sort()).toEqual(["2026-10-11", "2026-10-13"]);
    expect(r.current).toBe(3);
  });

  it("a miss with no streak to protect does not spend the rest day", () => {
    const r = computeStreak(days("2026-10-09"), "2026-10-10");
    expect(r.restDays.size).toBe(0);
    expect(r.current).toBe(1);
  });

  it("keeps the longest streak after a reset", () => {
    const r = computeStreak(days("2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-12"), "2026-10-12");
    expect(r.longest).toBe(4);
    expect(r.current).toBe(1);
  });
});

describe("calendar status", () => {
  const q = days("2026-10-06");
  const rest = days("2026-10-07");
  it("marks goal met, rest, missed, open and future days", () => {
    expect(dayStatus("2026-10-06", "2026-10-08", "2026-10-05", q, rest)).toBe("met");
    expect(dayStatus("2026-10-07", "2026-10-08", "2026-10-05", q, rest)).toBe("rest");
    expect(dayStatus("2026-10-05", "2026-10-08", "2026-10-05", q, rest)).toBe("missed");
    expect(dayStatus("2026-10-08", "2026-10-08", "2026-10-05", q, rest)).toBe("open");
    expect(dayStatus("2026-10-09", "2026-10-08", "2026-10-05", q, rest)).toBe("future");
  });
  it("leaves days before the learner joined blank", () => {
    expect(dayStatus("2026-10-01", "2026-10-08", "2026-10-05", q, rest)).toBe("before");
  });
});
