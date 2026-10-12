// Helpers for the content manager (PRD 7.13). Pure, so they are unit tested.

export type PartsResult = { ok: true; parts: string[][] | null } | { ok: false; error: string };

/**
 * The editor shows "built from" parts as one line each: `kana | romaji | meaning`.
 * An empty box means the item has no parts.
 */
export function parsePartsText(text: string | null | undefined): PartsResult {
  const lines = (text ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return { ok: true, parts: null };
  const parts: string[][] = [];
  for (const [i, line] of lines.entries()) {
    const cells = line.split("|").map((c) => c.trim());
    if (cells.length !== 3 || cells.some((c) => !c)) return { ok: false, error: `Part ${i + 1} must look like: kana | romaji | meaning` };
    parts.push(cells);
  }
  return { ok: true, parts };
}

export function partsToText(json: string | null): string {
  if (!json) return "";
  try {
    const raw = JSON.parse(json) as unknown;
    return Array.isArray(raw) ? raw.filter((p): p is string[] => Array.isArray(p)).map((p) => p.join(" | ")).join("\n") : "";
  } catch {
    return "";
  }
}

const partsKana = (json: string | null): string => {
  try {
    const raw = JSON.parse(json ?? "[]") as unknown;
    return Array.isArray(raw) ? raw.map((p) => (Array.isArray(p) ? p[0] : "")).join("|") : "";
  } catch {
    return "";
  }
};

/** Changed spoken text (the kana, or the kana of a part) means the audio must be generated again (FR-D2, FR-D6). */
export function spokenTextChanged(before: { kana: string; parts: string | null }, after: { kana: string; parts: string | null }): boolean {
  return before.kana !== after.kana || partsKana(before.parts) !== partsKana(after.parts);
}
