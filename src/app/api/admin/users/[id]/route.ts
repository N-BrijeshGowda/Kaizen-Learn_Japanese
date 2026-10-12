import { z } from "zod";
import { prisma } from "@/lib/db";
import { fail, json, readJson } from "@/lib/api";
import { audit } from "@/lib/admin";
import { guard, numericId } from "@/lib/admin-api";

const patchSchema = z.object({
  role: z.enum(["learner", "reviewer", "admin"]).optional(),
  status: z.enum(["active", "deactivated"]).optional(),
});

/** Would this change leave the app without an active admin? */
async function lastActiveAdmin(userId: number): Promise<boolean> {
  const admins = await prisma.user.findMany({ where: { role: "admin", status: "active" }, select: { id: true } });
  return admins.length === 1 && admins[0].id === userId;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const g = await guard(request, "admin");
  if (g.response) return g.response;
  const id = numericId((await context.params).id);
  const body = await readJson(request, patchSchema);
  if (!id || !body) return fail("Invalid request.", 422);

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return fail("User not found.", 404);

  // An admin cannot lock themselves out by accident.
  if (id === g.user.id && (body.role || body.status)) return fail("You cannot change your own role or status. Ask another admin.", 403);
  if (await lastActiveAdmin(id)) {
    if ((body.role && body.role !== "admin") || body.status === "deactivated") return fail("There must be at least one active admin.", 403);
  }

  const updated = await prisma.user.update({ where: { id }, data: { ...(body.role ? { role: body.role } : {}), ...(body.status ? { status: body.status } : {}) } });
  if (body.role && body.role !== target.role) await audit(g.user.id, "user.role", `user:${id} ${target.role} to ${body.role}`);
  if (body.status && body.status !== target.status) await audit(g.user.id, body.status === "deactivated" ? "user.deactivate" : "user.reactivate", `user:${id}`);
  return json({ id: updated.id, role: updated.role, status: updated.status });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const g = await guard(request, "admin");
  if (g.response) return g.response;
  const id = numericId((await context.params).id);
  if (!id) return fail("Invalid request.", 422);
  if (id === g.user.id) return fail("You cannot delete your own account here.", 403);
  if (await lastActiveAdmin(id)) return fail("There must be at least one active admin.", 403);

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!target) return fail("User not found.", 404);
  // Everything personal goes with the user: progress, points, quiz history (cascade).
  await prisma.user.delete({ where: { id } });
  await audit(g.user.id, "user.delete", `user:${id}`);
  return json({ ok: true });
}
