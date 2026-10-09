import { NextResponse, type NextRequest } from "next/server";

import { destroySession } from "@/lib/auth/session";

/**
 * Hard sign-out with cookie cleanup.
 *
 * Page guards send visitors here (instead of straight to /login) when the
 * session cookie cannot be matched to a live session row. Clearing the cookie
 * server-side breaks the loop where middleware keeps bouncing a stale but
 * well-formed token between /login and the protected area.
 */
export async function GET(request: NextRequest) {
  await destroySession();

  const next = request.nextUrl.searchParams.get("next");
  const reason = request.nextUrl.searchParams.get("reason");
  const target = new URL("/login", request.url);
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    target.searchParams.set("next", next);
  }
  if (reason === "idle") {
    target.searchParams.set("reason", "idle");
  }

  return NextResponse.redirect(target);
}
