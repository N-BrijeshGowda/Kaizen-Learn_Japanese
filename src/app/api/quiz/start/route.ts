import { z } from "zod";
import { fail, json, readJson, sameOrigin } from "@/lib/api";
import { getApiUser } from "@/lib/dal";
import { RuleError } from "@/lib/learning";
import { startQuiz } from "@/lib/quiz";

const schema = z.object({
  kind: z.enum(["daily", "unlock", "level"]),
  set: z.number().int().min(1).max(5).optional(),
  level: z.number().int().min(1).max(5).optional(),
});

/** Opens a quiz. The server picks the items and options; the browser never learns which option is right until it answers. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("Request blocked.", 403);
  const user = await getApiUser();
  if (!user) return fail("Not signed in.", 401);
  if (!user.onboardedAt) return fail("Finish onboarding first.", 403);
  const body = await readJson(request, schema);
  if (!body) return fail("Invalid quiz request.", 422);

  try {
    return json(await startQuiz(user.id, body.kind, { setNo: body.set, level: body.level }));
  } catch (error) {
    if (error instanceof RuleError) return fail(error.message, error.status);
    throw error;
  }
}
