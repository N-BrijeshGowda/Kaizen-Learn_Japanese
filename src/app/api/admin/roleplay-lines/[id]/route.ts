import { z } from "zod";
import { prisma } from "@/lib/db";
import { fail, json, readJson } from "@/lib/api";
import { audit } from "@/lib/admin";
import { guard, numericId } from "@/lib/admin-api";

const schema = z.object({
  kana: z.string().trim().min(1).max(255),
  romaji: z.string().trim().min(1).max(255),
  english: z.string().trim().min(1).max(255),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const g = await guard(request, "admin");
  if (g.response) return g.response;
  const id = numericId((await context.params).id);
  const body = await readJson(request, schema);
  if (!id || !body) return fail("Kana, romaji and English cannot be empty.", 422);

  const before = await prisma.roleplayLine.findUnique({ where: { id } });
  if (!before) return fail("Line not found.", 404);
  const changed = before.kana !== body.kana || before.romaji !== body.romaji || before.english !== body.english;
  if (!changed) return json({ version: before.version, reviewStatus: before.reviewStatus });

  const updated = await prisma.roleplayLine.update({
    where: { id },
    data: { ...body, version: { increment: 1 }, reviewStatus: "draft", reviewNote: null },
  });
  await audit(g.user.id, "roleplay-line.edit", `line:${id} v${updated.version}${before.kana !== body.kana ? " audio" : ""}`);
  return json({ version: updated.version, reviewStatus: updated.reviewStatus });
}
