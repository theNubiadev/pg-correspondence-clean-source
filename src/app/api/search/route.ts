import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { globalSearch } from "@/server/queries/search";

/**
 * Backs the command palette. A route handler rather than a Server Action
 * because the palette fires on every keystroke and needs a plain cancellable
 * GET that React Query can dedupe and abort.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("q") ?? "";

  try {
    const results = await globalSearch(user, query);
    return NextResponse.json(
      { results },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Search is unavailable" },
      {
        status: 503,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }
}
