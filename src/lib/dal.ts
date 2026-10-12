import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/**
 * The signed-in user, re-read from MySQL on every request (PRD 12, Authentication), so a deactivated
 * account, or a session issued before a password reset, stops working at once.
 */
export const getUser = cache(async () => {
  const session = await auth();
  const id = Number(session?.user?.id);
  if (!session?.user || !Number.isInteger(id)) return null;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.status !== "active") return null;
  if (user.sessionVersion !== (session.user.sv ?? 0)) return null;
  return user;
});

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getUser>>>;

/** For pages inside the app: needs a session and finished onboarding. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect("/signin");
  if (!user.onboardedAt) redirect("/onboarding");
  return user;
}

/** For API route handlers: returns null instead of redirecting. */
export async function getApiUser(): Promise<SessionUser | null> {
  return getUser();
}

export function requireRole(user: SessionUser, ...roles: SessionUser["role"][]) {
  if (!roles.includes(user.role)) redirect("/");
}

/** For admin and reviewer API routes: the user only if they hold one of the roles. Checked on the server on every request. */
export async function getApiUserWithRole(...roles: SessionUser["role"][]): Promise<SessionUser | null> {
  const user = await getUser();
  return user && roles.includes(user.role) ? user : null;
}
