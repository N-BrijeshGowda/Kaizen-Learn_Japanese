import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "@/lib/csv";
import { rankLearners, visibleRows, type RankInput } from "@/lib/ranking-core";
import { openStates, tierOf } from "@/lib/roleplay-core";

describe("role-play tiers and unlocking", () => {
  it("derives the tier from the position, six to a tier", () => {
    expect([1, 6, 7, 12, 13, 18, 19, 24].map(tierOf)).toEqual(["Starter", "Starter", "Easy", "Easy", "Medium", "Medium", "Challenge", "Challenge"]);
  });

  it("opens only the first role-play at the start", () => {
    const open = openStates([10, 11, 12], new Set());
    expect([open.get(10), open.get(11), open.get(12)]).toEqual([true, false, false]);
  });

  it("opens the next one once the one before is complete", () => {
    const open = openStates([10, 11, 12], new Set([10]));
    expect([open.get(10), open.get(11), open.get(12)]).toEqual([true, true, false]);
  });

  it("does not skip: finishing a later one does not open the gap", () => {
    const open = openStates([10, 11, 12], new Set([12]));
    expect(open.get(11)).toBe(false);
  });
});

const row = (userId: number, points: number, reachedAt: number, level = 1): RankInput => ({ userId, name: `User ${userId}`, level, points, reachedAt });

describe("ranking", () => {
  it("orders by points, highest first", () => {
    expect(rankLearners([row(1, 10, 1), row(2, 50, 2), row(3, 30, 3)]).map((r) => r.userId)).toEqual([2, 3, 1]);
  });

  it("breaks ties by who reached the score first", () => {
    const ranked = rankLearners([row(1, 40, 2000), row(2, 40, 1000), row(3, 40, 3000)]);
    expect(ranked.map((r) => r.userId)).toEqual([2, 1, 3]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it("ranks learners with no points too", () => {
    expect(rankLearners([row(1, 0, 5), row(2, 0, 3)]).map((r) => r.userId)).toEqual([2, 1]);
  });

  it("shows the top 20 and no extra row when the viewer is inside it", () => {
    const ranked = rankLearners(Array.from({ length: 30 }, (_, i) => row(i + 1, 300 - i, i)));
    const view = visibleRows(ranked, 5);
    expect(view.top).toHaveLength(20);
    expect(view.me).toBeNull();
  });

  it("adds the viewer's own row and position when they are outside the top 20", () => {
    const ranked = rankLearners(Array.from({ length: 30 }, (_, i) => row(i + 1, 300 - i, i)));
    const view = visibleRows(ranked, 27);
    expect(view.top).toHaveLength(20);
    expect(view.me).toMatchObject({ userId: 27, rank: 27 });
  });
});

describe("CSV export", () => {
  it("quotes commas, quotes and line breaks", () => {
    expect(csvCell('Priya, "PM"')).toBe('"Priya, ""PM"""');
    expect(csvCell("two\nlines")).toBe('"two\nlines"');
  });

  it("neutralises spreadsheet formulas in text typed by users", () => {
    expect(csvCell("=HYPERLINK(\"http://x\")")).toBe(`"'=HYPERLINK(""http://x"")"`);
    expect(csvCell("+1")).toBe("'+1");
    expect(csvCell("@cmd")).toBe("'@cmd");
    expect(csvCell("-2+3")).toBe("'-2+3");
  });

  it("leaves real numbers and booleans alone", () => {
    expect(csvCell(-5)).toBe("-5");
    expect(csvCell(true)).toBe("1");
    expect(csvCell(null)).toBe("");
  });

  it("writes a header row and CRLF line endings", () => {
    expect(toCsv(["a", "b"], [[1, "x"]])).toBe("a,b\r\n1,x\r\n");
  });
});
