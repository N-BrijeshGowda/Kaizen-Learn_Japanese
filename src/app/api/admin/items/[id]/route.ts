import { z } from "zod";
import { prisma } from "@/lib/db";
import { fail, json, readJson } from "@/lib/api";
import { audit } from "@/lib/admin";
import { guard, numericId } from "@/lib/admin-api";
import { parsePartsText, spokenTextChanged } from "@/lib/content-edit-core";

const schema = z.object({
  kana: z.string().trim().min(1).max(255),
  romaji: z.string().trim().min(1).max(255),
  english: z.string().trim().min(1).max(255),
  note: z.string().trim().max(1000),
  parts: z.string().max(2000).nullable(),
});

/** Edits go live at once, with no redeploy. Changed text goes back to draft for the reviewer and bumps the version. */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const g = await guard(request, "admin");
  if (g.response) return g.response;
  const id = numericId((await context.params).id);
  const body = await readJson(request, schema);
  if (!id || !body) return fail("Check the fields: kana, romaji and English cannot be empty.", 422);

  const parsed = parsePartsText(body.parts);
  if (!parsed.ok) return fail(parsed.error, 422);
  const partsJson = parsed.parts ? JSON.stringify(parsed.parts) : null;

  const before = await prisma.item.findUnique({ where: { id } });
  if (!before) return fail("Item not found.", 404);

  const textChanged = before.kana !== body.kana || before.romaji !== body.romaji || before.english !== body.english || before.parts !== partsJson;
  const audioStale = spokenTextChanged(before, { kana: body.kana, parts: partsJson });

  const updated = await prisma.item.update({
    where: { id },
    data: {
      kana: body.kana,
      romaji: body.romaji,
      english: body.english,
      note: body.note,
      parts: partsJson,
      ...(textChanged ? { version: { increment: 1 }, reviewStatus: "draft" as const } : {}),
    },
  });
  if (textChanged) await audit(g.user.id, "item.edit", `item:${id} v${updated.version}${audioStale ? " audio" : ""}`);
  return json({ version: updated.version, reviewStatus: updated.reviewStatus, audioNeedsRegeneration: audioStale });
}
