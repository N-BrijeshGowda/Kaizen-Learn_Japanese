import { z } from "zod";
import { fail, json, readJson, sameOrigin } from "@/lib/api";
import { getApiUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { similarity } from "@/lib/roleplay-core";

const body = z.object({ text: z.string().trim().min(1).max(200) });

/** Looks the spoken phrase up in the app's own phrases and role-play lines. There is no outside translation service. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("Request blocked.", 403);
  const user = await getApiUser();
  if (!user) return fail("Not signed in.", 401);

  const data = await readJson(request, body);
  if (!data) return fail("Nothing to translate.", 400);

  const [items, lines] = await Promise.all([
    prisma.item.findMany({ where: { reviewStatus: { not: "wrong" } }, select: { kana: true, english: true } }),
    prisma.roleplayLine.findMany({ where: { reviewStatus: { not: "wrong" } }, select: { kana: true, english: true } }),
  ]);

  let best: { kana: string; english: string } | null = null;
  let bestScore = 0;
  for (const c of [...items, ...lines]) {
    const score = similarity(data.text, c.kana);
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return json(best && bestScore >= 0.75 ? { english: best.english, kana: best.kana } : { english: null });
}
