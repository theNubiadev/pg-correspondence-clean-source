import "server-only";

import type { Authentic, User } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  normalizeUniversityType,
  resolveUniversityType,
  syntheticEmailForUsername,
} from "@/lib/auth/university-types";

export function displayNameFromUsername(username: string): string {
  const trimmed = username.trim();
  if (trimmed.length <= 3) return trimmed.toUpperCase();
  return trimmed
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function officeIdForMappedType(
  userType: string,
): Promise<string | null> {
  const mapped = resolveUniversityType(userType);
  if (!mapped?.officeName) return null;
  const office = await prisma.destinationOffice.findUnique({
    where: { officeName: mapped.officeName },
    select: { id: true },
  });
  return office?.id ?? null;
}

export type UpsertAuthenticInput = {
  username: string;
  /** bcrypt hash */
  passHash: string;
  userType: string;
  mustChangePassword?: boolean;
  fullName?: string;
  /** Prefer linking/updating this users row (admin edit by id). */
  linkUserId?: string;
  email?: string;
};

/**
 * Upsert university authentic row and ensure a linked users profile exists
 * (role / office derived from user_type).
 */
export async function upsertAuthenticAndProvision(
  input: UpsertAuthenticInput,
): Promise<{ authentic: Authentic; user: User }> {
  const username = input.username.trim().toLowerCase().slice(0, 100);
  const userType = normalizeUniversityType(input.userType);
  const mapped = resolveUniversityType(userType);
  if (!username || !userType || !mapped) {
    throw new Error(
      `Unknown or incomplete university account: username=${input.username} user_type=${input.userType}`,
    );
  }

  const destinationOfficeId = await officeIdForMappedType(userType);
  if (mapped.officeName && !destinationOfficeId) {
    throw new Error(
      `Destination office "${mapped.officeName}" not found for user_type=${userType}`,
    );
  }

  const email =
    input.email?.trim().toLowerCase() || syntheticEmailForUsername(username);
  const fullName = input.fullName?.trim() || displayNameFromUsername(username);
  const mustChangePassword = input.mustChangePassword ?? false;

  const byUserId = input.linkUserId
    ? await prisma.authentic.findUnique({ where: { userId: input.linkUserId } })
    : null;
  const byUsername = await prisma.authentic.findUnique({ where: { username } });

  if (
    byUserId &&
    byUsername &&
    byUserId.id !== byUsername.id
  ) {
    throw new Error(`Username "${username}" is already taken`);
  }

  const existingAuth = byUserId ?? byUsername;

  const userData = {
    username,
    email,
    fullName,
    passwordHash: input.passHash,
    userType,
    role: mapped.role,
    status: "ACTIVE" as const,
    destinationOfficeId,
    mustChangePassword,
  };

  let user: User;
  const preferredId = input.linkUserId ?? existingAuth?.userId ?? null;

  if (preferredId) {
    user = await prisma.user.update({
      where: { id: preferredId },
      data: userData,
    });
  } else {
    const byUsernameOrEmail = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    });
    if (byUsernameOrEmail) {
      user = await prisma.user.update({
        where: { id: byUsernameOrEmail.id },
        data: userData,
      });
    } else {
      user = await prisma.user.create({ data: userData });
    }
  }

  const authentic = existingAuth
    ? await prisma.authentic.update({
        where: { id: existingAuth.id },
        data: {
          username,
          pass: input.passHash,
          userType,
          userId: user.id,
        },
      })
    : await prisma.authentic.create({
        data: {
          username,
          pass: input.passHash,
          userType,
          userId: user.id,
        },
      });

  return { authentic, user };
}

/** Sync password hash onto authentic (if linked) and users. */
export async function syncPasswordHashes(
  userId: string,
  passHash: string,
): Promise<void> {
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: passHash,
        mustChangePassword: false,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    }),
    prisma.authentic.updateMany({
      where: { userId },
      data: { pass: passHash },
    }),
  ]);
}

/**
 * Ensure the linked users row matches authentic.user_type / pass.
 * Creates the users row when missing.
 */
export async function ensureUserFromAuthentic(
  authentic: Authentic,
): Promise<User> {
  return (
    await upsertAuthenticAndProvision({
      username: authentic.username,
      passHash: authentic.pass,
      userType: authentic.userType,
      mustChangePassword: false,
      linkUserId: authentic.userId ?? undefined,
    })
  ).user;
}
