import { z } from "zod";
import { prisma } from "@/lib/db";
import { fail, json, readJson } from "@/lib/api";
import { audit } from "@/lib/admin";
import { guard, numericId } from "@/lib/admin-api";

const schema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  subtitle: z.string().trim().min(1).max(200).optional(),
  status: z.enum(["draft", "published"]).optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const g = await guard(request, "admin");
  if (g.response) return g.response;
  const id = numericId((await context.params).id);
  const body = await readJson(request, schema);
  if (!id || !body) return fail("Invalid request.", 422);

  const before = await prisma.level.findUnique({ where: { id } });
  if (!before) return fail("Level not found.", 404);
  const updated = await prisma.level.update({ where: { id }, data: body });
  if (body.status && body.status !== before.status) await audit(g.user.id, body.status === "published" ? "level.publish" : "level.unpublish", `level:${id}`);
  else await audit(g.user.id, "level.edit", `level:${id}`);
  return json({ status: updated.status });
}
