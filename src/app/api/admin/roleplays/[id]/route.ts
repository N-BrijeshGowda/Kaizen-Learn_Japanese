import { z } from "zod";
import { prisma } from "@/lib/db";
import { fail, json, readJson } from "@/lib/api";
import { audit } from "@/lib/admin";
import { guard, numericId } from "@/lib/admin-api";

const schema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  scene: z.string().trim().min(1).max(255).optional(),
  status: z.enum(["draft", "published"]).optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const g = await guard(request, "admin");
  if (g.response) return g.response;
  const id = numericId((await context.params).id);
  const body = await readJson(request, schema);
  if (!id || !body) return fail("Invalid request.", 422);

  const before = await prisma.roleplay.findUnique({ where: { id } });
  if (!before) return fail("Role-play not found.", 404);
  const updated = await prisma.roleplay.update({ where: { id }, data: body });
  if (body.status && body.status !== before.status) await audit(g.user.id, body.status === "published" ? "roleplay.publish" : "roleplay.unpublish", `roleplay:${id}`);
  else await audit(g.user.id, "roleplay.edit", `roleplay:${id}`);
  return json({ status: updated.status });
}
