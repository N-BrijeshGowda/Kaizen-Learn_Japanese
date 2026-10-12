import { z } from "zod";
import { prisma } from "@/lib/db";
import { fail, json, readJson, sameOrigin } from "@/lib/api";
import { hashPassword } from "@/lib/password";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const HOUR = 60 * 60 * 1000;

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(128),
});

/** "priya.nair@company.com" becomes "Priya Nair", a starting point for the onboarding name field. */
function nameFromEmail(email: string) {
  const local = email.split("@")[0].replace(/[._+-]+/g, " ").replace(/\d+/g, " ").trim();
  const words = local.split(/\s+/).filter(Boolean).slice(0, 3);
  const name = words.map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
  return (name || "Learner").slice(0, 80);
}

/** Creates the account. There is no email step: the browser signs in straight after this returns. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("Request blocked.", 403);
  const body = await readJson(request, schema);
  if (!body) return fail("Enter a valid email and a password of 8 to 128 characters.", 422);

  if (!rateLimit(`signup:ip:${clientIp(request.headers)}`, 20, HOUR).ok) {
    return fail("Too many attempts. Please try again later.", 429);
  }

  if (await prisma.user.findUnique({ where: { email: body.email } })) {
    return fail("An account with this email already exists. Sign in instead.", 409);
  }

  await prisma.user.create({
    data: {
      email: body.email,
      passwordHash: await hashPassword(body.password),
      name: nameFromEmail(body.email),
      emailVerifiedAt: new Date(),
      userLevels: { create: { levelId: 1, unlockedVia: "start" } },
    },
  });
  return json({ ok: true });
}
