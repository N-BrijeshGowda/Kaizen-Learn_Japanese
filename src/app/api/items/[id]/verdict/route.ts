import { z } from "zod";
import { prisma } from "@/lib/db";
import { fail, json, readJson } from "@/lib/api";
import { guard, numericId } from "@/lib/admin-api";

const schema = z
  .object({
    verdict: z.enum(["approved", "wrong"]),
    target: z.enum(["text", "audio"]).default("text"),
    reason: z.string().trim().max(1000).optional(),
  })
  .refine((v) => v.verdict !== "wrong" || (v.reason && v.reason.length >= 3), { message: "reason" });

/** Reviewer marks an item OK or Wrong with a reason. Wrong items go back to the admin to fix and republish (FR-D5). */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const g = await guard(request, "reviewer", "admin");
  if (g.response) return g.response;
  const id = numericId((await context.params).id);
  const body = await readJson(request, schema);
  if (!id || !body) return fail("A reason is needed when marking something Wrong.", 422);

  const item = await prisma.item.findUnique({ where: { id }, select: { id: true } });
  if (!item) return fail("Item not found.", 404);

  await prisma.itemReview.create({
    data: { itemId: id, reviewerId: g.user.id, target: body.target, verdict: body.verdict, reason: body.verdict === "wrong" ? body.reason : null },
  });
  await prisma.item.update({ where: { id }, data: { reviewStatus: body.verdict } });
  return json({ reviewStatus: body.verdict });
}
