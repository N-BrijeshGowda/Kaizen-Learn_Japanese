import { z } from "zod";
import { prisma } from "@/lib/db";
import { fail, json, readJson, sameOrigin } from "@/lib/api";
import { getApiUser } from "@/lib/dal";
import { dateOnly, istDateString } from "@/lib/time";

// Client-side events. Only "say_it" exists in this release (FR-R7).
const schema = z.object({ type: z.literal("say_it"), itemId: z.number().int().positive() });

export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("Request blocked.", 403);
  const user = await getApiUser();
  if (!user) return fail("Not signed in.", 401);
  const body = await readJson(request, schema);
  if (!body) return fail("Invalid event.", 422);

  const item = await prisma.item.findUnique({ where: { id: body.itemId }, select: { id: true } });
  if (!item) return fail("Item not found.", 404);

  await prisma.studyEvent.create({
    data: { userId: user.id, type: "say_it", itemId: item.id, localDate: dateOnly(istDateString()) },
  });
  return json({ ok: true });
}
