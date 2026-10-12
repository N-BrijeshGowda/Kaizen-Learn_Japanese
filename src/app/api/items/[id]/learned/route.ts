import { fail, json, sameOrigin } from "@/lib/api";
import { getApiUser } from "@/lib/dal";
import { markItemLearned, RuleError } from "@/lib/learning";
import { rebuildUnansweredSets } from "@/lib/quiz";
import { refreshStreak } from "@/lib/streak";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return fail("Request blocked.", 403);
  const user = await getApiUser();
  if (!user) return fail("Not signed in.", 401);
  if (!user.onboardedAt) return fail("Finish onboarding first.", 403);

  const itemId = Number((await context.params).id);
  if (!Number.isInteger(itemId) || itemId <= 0) return fail("Item not found.", 404);

  try {
    const result = await markItemLearned(user.id, itemId);
    // Finishing a level opens the next one, so today's unanswered quiz sets pick it up at once.
    if (result.unlockedLevelId) await rebuildUnansweredSets(user.id, result.unlockedLevelId);
    if (result.goalJustMet) result.streak = (await refreshStreak(user.id)).current;
    return json(result);
  } catch (error) {
    if (error instanceof RuleError) return fail(error.message, error.status);
    throw error;
  }
}
