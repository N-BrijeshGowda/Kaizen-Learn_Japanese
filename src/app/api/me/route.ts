import { z } from "zod";
import { prisma } from "@/lib/db";
import { fail, json, readJson, sameOrigin } from "@/lib/api";
import { getApiUser } from "@/lib/dal";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  showRomaji: z.boolean().optional(),
  completeOnboarding: z.literal(true).optional(),
});

export async function GET() {
  const user = await getApiUser();
  if (!user) return fail("Not signed in.", 401);
  return json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    showRomaji: user.showRomaji,
    onboarded: Boolean(user.onboardedAt),
  });
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return fail("Request blocked.", 403);
  const user = await getApiUser();
  if (!user) return fail("Not signed in.", 401);
  const body = await readJson(request, patchSchema);
  if (!body) return fail("Check the name (1 to 80 characters) and try again.", 422);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(body.name !== undefined ? { name: body.name.replace(/[\u0000-\u001f]/g, "") } : {}),
      ...(body.showRomaji !== undefined ? { showRomaji: body.showRomaji } : {}),
      ...(body.completeOnboarding && !user.onboardedAt ? { onboardedAt: new Date() } : {}),
    },
  });
  return json({ name: updated.name, showRomaji: updated.showRomaji, onboarded: Boolean(updated.onboardedAt) });
}
