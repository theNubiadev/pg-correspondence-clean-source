import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/jwt";

/**
 * Coarse gate at the edge.
 *
 * This only checks that the caller holds a well-formed, unexpired session
 * token, which is enough to bounce anonymous traffic before it reaches a
 * render. It is not the authorisation boundary: whether the session row is
 * still live, and what the user may actually do, is settled in the layout and
 * in each Server Action, where the database is reachable. Both layers matter —
 * this one keeps the app fast, the other keeps it correct.
 */

const PUBLIC_PATHS = [
  "/login",
  "/forgot-password",
  "/reset-password",
] as const;

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const claims = token ? await verifySessionToken(token) : null;

  if (isPublicPath(pathname)) {
    if (claims) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (!claims) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("next", `${pathname}${search}`);
    }
    const response = NextResponse.redirect(loginUrl);
    // Clear a stale or tampered cookie so the visitor is not stuck in a loop.
    if (token) response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Everything except Next internals, static assets and the health check.
     * Keeping images and fonts out of the matcher avoids paying for a JWT
     * verification on every asset request.
     */
    "/((?!_next/static|_next/image|favicon.ico|brand/|api/health|.*\\.(?:png|jpg|jpeg|svg|webp|ico|woff2?)$).*)",
  ],
};
