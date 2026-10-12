import { z } from "zod";
import { fail, json, readJson, sameOrigin } from "@/lib/api";
import { getApiUser } from "@/lib/dal";
import { RuleError } from "@/lib/learning";
import { completeQuiz } from "@/lib/quiz";

const schema = z.object({ attemptId: z.number().int().positive() });

/** Scores the attempt from the answers the server stored and awards points where the rules allow it. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("Request blocked.", 403);
  const user = await getApiUser();
  if (!user) return fail("Not signed in.", 401);
  const body = await readJson(request, schema);
  if (!body) return fail("Invalid request.", 422);

  try {
    return json(await completeQuiz(user.id, body.attemptId));
  } catch (error) {
    if (error instanceof RuleError) return fail(error.message, error.status);
    throw error;
  }
}
