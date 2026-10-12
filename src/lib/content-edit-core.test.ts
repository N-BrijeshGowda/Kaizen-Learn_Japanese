import { describe, expect, it } from "vitest";
import { parsePartsText, partsToText, spokenTextChanged } from "@/lib/content-edit-core";

describe("parts editor text", () => {
  it("turns lines into parts", () => {
    expect(parsePartsText("おはよう | ohayoo | good morning\nございます | gozaimasu | polite ending")).toEqual({
      ok: true,
      parts: [["おはよう", "ohayoo", "good morning"], ["ございます", "gozaimasu", "polite ending"]],
    });
  });

  it("treats an empty box as no parts", () => {
    expect(parsePartsText("  \n ")).toEqual({ ok: true, parts: null });
    expect(parsePartsText(null)).toEqual({ ok: true, parts: null });
  });

  it("rejects a line without exactly three filled cells and says which", () => {
    const r = parsePartsText("おはよう | ohayoo | good morning\nございます | gozaimasu");
    expect(r).toEqual({ ok: false, error: "Part 2 must look like: kana | romaji | meaning" });
    expect(parsePartsText("a | | c").ok).toBe(false);
  });

  it("round-trips through the stored JSON", () => {
    const stored = JSON.stringify([["おはよう", "ohayoo", "good morning"]]);
    expect(partsToText(stored)).toBe("おはよう | ohayoo | good morning");
    expect(partsToText(null)).toBe("");
    expect(partsToText("not json")).toBe("");
  });
});

describe("spoken text change", () => {
  const base = { kana: "ありがとう", parts: JSON.stringify([["あり", "ari", "x"]]) };
  it("is false when only romaji, English or notes change", () => {
    expect(spokenTextChanged(base, { ...base })).toBe(false);
  });
  it("is true when the kana changes", () => {
    expect(spokenTextChanged(base, { ...base, kana: "ありがとうございます" })).toBe(true);
  });
  it("is true when the kana of a part changes", () => {
    expect(spokenTextChanged(base, { ...base, parts: JSON.stringify([["ありが", "ari", "x"]]) })).toBe(true);
  });
  it("ignores edits to a part's meaning", () => {
    expect(spokenTextChanged(base, { ...base, parts: JSON.stringify([["あり", "ari", "changed"]]) })).toBe(false);
  });
});
