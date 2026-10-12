import { describe, expect, it } from "vitest";
import { addDays, greetingFor, istDateString, istHour, istWeekStart } from "@/lib/time";

describe("IST day boundary (midnight India Standard Time, UTC+5:30)", () => {
  it("is still the same IST day one second before midnight IST", () => {
    expect(istDateString(new Date("2026-10-07T18:29:59Z"))).toBe("2026-10-07");
  });

  it("rolls to the next IST day at 18:30 UTC", () => {
    expect(istDateString(new Date("2026-10-07T18:30:00Z"))).toBe("2026-10-08");
  });

  it("crosses a month and year boundary correctly", () => {
    expect(istDateString(new Date("2026-12-31T18:30:00Z"))).toBe("2027-01-01");
    expect(istDateString(new Date("2026-02-28T18:30:00Z"))).toBe("2026-03-01");
  });

  it("does not depend on the server's own time zone", () => {
    // 20:00 UTC on the 7th is already 01:30 on the 8th in India.
    expect(istDateString(new Date("2026-10-07T20:00:00Z"))).toBe("2026-10-08");
    expect(istHour(new Date("2026-10-07T20:00:00Z"))).toBe(1);
  });
});

describe("calendar week (Monday start, used for the weekly rest day)", () => {
  it("gives Monday for any day of that week", () => {
    expect(istWeekStart("2026-10-05")).toBe("2026-10-05"); // Monday
    expect(istWeekStart("2026-10-08")).toBe("2026-10-05"); // Thursday
    expect(istWeekStart("2026-10-11")).toBe("2026-10-05"); // Sunday belongs to the week before the next Monday
    expect(istWeekStart("2026-10-12")).toBe("2026-10-12"); // next Monday
  });

  it("works across a month boundary", () => {
    expect(istWeekStart("2026-11-01")).toBe("2026-10-26"); // Sunday
  });
});

describe("addDays", () => {
  it("adds and subtracts whole days", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-10-08", 30)).toBe("2026-11-07");
  });
});

describe("greeting", () => {
  it("follows the IST hour", () => {
    expect(greetingFor(new Date("2026-10-08T03:30:00Z"))).toBe("Good morning"); // 09:00 IST
    expect(greetingFor(new Date("2026-10-08T07:30:00Z"))).toBe("Good afternoon"); // 13:00 IST
    expect(greetingFor(new Date("2026-10-08T13:30:00Z"))).toBe("Good evening"); // 19:00 IST
  });
});
