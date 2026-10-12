import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: no session cookie means go to sign-in. The real checks (valid session,
// active user, role, gating) happen on the server next to the data, in src/lib/dal.ts.
const PUBLIC_PAGES = ["/signin"];
const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();

  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));
  if (!hasSession) {
    const url = new URL("/signin", request.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Everything except API routes, Next internals and static files.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|audio/|icons/|.*\\.(?:png|jpg|jpeg|svg|webp|ico|mp3|json|txt|js)$).*)"],
};
