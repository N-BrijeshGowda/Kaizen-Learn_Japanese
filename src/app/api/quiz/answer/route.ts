import { z } from "zod";
import { fail, json, readJson, sameOrigin } from "@/lib/api";
import { getApiUser } from "@/lib/dal";
import { RuleError } from "@/lib/learning";
import { recordAnswer } from "@/lib/quiz";

const schema = z.object({
  attemptId: z.number().int().positive(),
  index: z.number().int().min(0).max(4),
  chosen: z.number().int().positive(),
});

export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("Request blocked.", 403);
  const user = await getApiUser();
  if (!user) return fail("Not signed in.", 401);
  const body = await readJson(request, schema);
  if (!body) return fail("Invalid answer.", 422);

  try {
    return json(await recordAnswer(user.id, body.attemptId, body.index, body.chosen));
  } catch (error) {
    if (error instanceof RuleError) return fail(error.message, error.status);
    throw error;
  }
}
