import { z } from "zod";
import { prisma } from "@/lib/db";
import { fail, json, readJson } from "@/lib/api";
import { audit } from "@/lib/admin";
import { guard, numericId } from "@/lib/admin-api";

const schema = z.object({ name: z.string().trim().min(1).max(80) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const g = await guard(request, "admin");
  if (g.response) return g.response;
  const id = numericId((await context.params).id);
  const body = await readJson(request, schema);
  if (!id || !body) return fail("Invalid request.", 422);

  const exists = await prisma.learnSet.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return fail("Set not found.", 404);
  await prisma.learnSet.update({ where: { id }, data: { name: body.name } });
  await audit(g.user.id, "set.edit", `set:${id}`);
  return json({ ok: true });
}
