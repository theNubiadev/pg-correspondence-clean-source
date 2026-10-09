import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/jwt";
import { sessionIdleCutoff } from "@/lib/auth/session-policy";
import { prisma } from "@/lib/prisma";
import { touchSession } from "@/lib/auth/session";

function signedOut(reason: "idle" | "invalid" = "invalid") {
  const response = NextResponse.json(
    { signedOut: true, reason },
    {
      status: 401,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const claims = token ? await verifySessionToken(token) : null;
  if (!claims) return signedOut();

  const session = await prisma.session.findFirst({
    where: {
      id: claims.sid,
      userId: claims.sub,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true, lastSeenAt: true },
  });

  if (!session) return signedOut();

  if (session.lastSeenAt <= sessionIdleCutoff()) {
    await prisma.session.updateMany({
      where: { id: session.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return signedOut("idle");
  }

  await touchSession(session.id);
  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "private, no-store" },
  });
}
