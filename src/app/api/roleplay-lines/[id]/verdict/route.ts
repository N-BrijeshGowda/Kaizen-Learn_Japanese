import { z } from "zod";
import { prisma } from "@/lib/db";
import { fail, json, readJson } from "@/lib/api";
import { guard, numericId } from "@/lib/admin-api";

const schema = z
  .object({
    verdict: z.enum(["approved", "wrong"]),
    reason: z.string().trim().max(1000).optional(),
  })
  .refine((v) => v.verdict !== "wrong" || (v.reason && v.reason.length >= 3), { message: "reason" });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const g = await guard(request, "reviewer", "admin");
  if (g.response) return g.response;
  const id = numericId((await context.params).id);
  const body = await readJson(request, schema);
  if (!id || !body) return fail("A reason is needed when marking something Wrong.", 422);

  const line = await prisma.roleplayLine.findUnique({ where: { id }, select: { id: true } });
  if (!line) return fail("Line not found.", 404);
  await prisma.roleplayLine.update({
    where: { id },
    data: { reviewStatus: body.verdict, reviewNote: body.verdict === "wrong" ? body.reason : null },
  });
  return json({ reviewStatus: body.verdict });
}
