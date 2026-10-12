import "server-only";
import type { NextResponse } from "next/server";
import { fail, sameOrigin } from "@/lib/api";
import { getUser, type SessionUser } from "@/lib/dal";

/**
 * Every admin and reviewer endpoint starts here: same-origin check, signed in, and the role is checked
 * against the database on this request (never trusted from the browser).
 */
export async function guard(
  request: Request,
  ...roles: SessionUser["role"][]
): Promise<{ user: SessionUser; response?: undefined } | { user?: undefined; response: NextResponse }> {
  if (request.method !== "GET" && !sameOrigin(request)) return { response: fail("Request blocked.", 403) };
  const user = await getUser();
  if (!user) return { response: fail("Not signed in.", 401) };
  if (!roles.includes(user.role)) return { response: fail("You do not have access to this.", 403) };
  return { user };
}

export function numericId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}
