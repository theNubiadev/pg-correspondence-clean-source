import "server-only";

import { cache } from "react";
import { cookies, headers } from "next/headers";
import type { UserRole, UserStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { generateToken, hashToken } from "@/lib/auth/password";
import { sessionIdleCutoff } from "@/lib/auth/session-policy";
import {
  SESSION_COOKIE,
  sessionMaxAgeSeconds,
  signSessionToken,
  verifySessionToken,
} from "@/lib/auth/jwt";

export type CurrentUser = {
  id: string;
  email: string;
  username: string;
  fullName: string;
  initials: string;
  role: UserRole;
  status: UserStatus;
  mustChangePassword: boolean;
  destinationOfficeId: string | null;
  destinationOfficeName: string | null;
  sessionId: string;
};

export type RequestMeta = { ipAddress: string | null; userAgent: string | null };

export async function getRequestMeta(): Promise<RequestMeta> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip") ||
    headerList.get("cf-connecting-ip") ||
    null;
  return { ipAddress, userAgent: headerList.get("user-agent") };
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const claims = await verifySessionToken(token);
  if (!claims) return null;

  const session = await prisma.session.findFirst({
    where: {
      id: claims.sid,
      userId: claims.sub,
      revokedAt: null,
      expiresAt: { gt: new Date() },
      lastSeenAt: { gt: sessionIdleCutoff() },
    },
    select: {
      id: true,
      user: {
        select: {
          id: true,
          email: true,
          username: true,
          fullName: true,
          role: true,
          status: true,
          mustChangePassword: true,
          destinationOfficeId: true,
          destinationOffice: { select: { officeName: true } },
        },
      },
    },
  });

  const user = session?.user;
  if (!user || user.status !== "ACTIVE") return null;

  const nameParts = user.fullName.trim().split(/\s+/);
  const initials =
    nameParts.length >= 2
      ? `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(0)}`.toUpperCase()
      : user.fullName.slice(0, 2).toUpperCase();

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    fullName: user.fullName,
    initials,
    role: user.role,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
    destinationOfficeId: user.destinationOfficeId,
    destinationOfficeName: user.destinationOffice?.officeName ?? null,
    sessionId: session.id,
  };
});

export async function createSession(
  userId: string,
  meta: RequestMeta,
): Promise<void> {
  const maxAge = sessionMaxAgeSeconds();
  const rawToken = generateToken();

  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(rawToken),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      expiresAt: new Date(Date.now() + maxAge * 1000),
    },
    select: { id: true },
  });

  const jwt = await signSessionToken({ sid: session.id, sub: userId });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, jwt, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
}

export async function destroySession(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  cookieStore.delete(SESSION_COOKIE);

  if (!token) return null;
  const claims = await verifySessionToken(token);
  if (!claims) return null;

  await prisma.session.updateMany({
    where: { id: claims.sid, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return claims.sub;
}

export async function revokeAllSessions(
  userId: string,
  exceptSessionId?: string,
): Promise<void> {
  await prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
    },
    data: { revokedAt: new Date() },
  });
}

export async function touchSession(sessionId: string): Promise<void> {
  await prisma.session.update({
    where: { id: sessionId },
    data: { lastSeenAt: new Date() },
  });
}
