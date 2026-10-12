import { fail, json, sameOrigin } from "@/lib/api";
import { getApiUser } from "@/lib/dal";
import { RuleError } from "@/lib/learning";
import { completeRoleplay } from "@/lib/roleplay";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return fail("Request blocked.", 403);
  const user = await getApiUser();
  if (!user) return fail("Not signed in.", 401);
  if (!user.onboardedAt) return fail("Finish onboarding first.", 403);

  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id <= 0) return fail("Role-play not found.", 404);

  try {
    return json(await completeRoleplay(user.id, id));
  } catch (error) {
    if (error instanceof RuleError) return fail(error.message, error.status);
    throw error;
  }
}
