"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import {
  DUMMY_PASSWORD_HASH,
  generateToken,
  hashPassword,
  hashToken,
  verifyPassword,
} from "@/lib/auth/password";
import {
  ensureUserFromAuthentic,
  syncPasswordHashes,
} from "@/lib/auth/provision-from-authentic";
import {
  createSession,
  destroySession,
  getRequestMeta,
  revokeAllSessions,
} from "@/lib/auth/session";
import { requireAuth } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/audit";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";
import {
  actionError,
  actionErrorFromZod,
  actionSuccess,
  formToObject,
  toActionError,
  type ActionState,
} from "@/server/actions/types";

const RESET_TOKEN_TTL_MINUTES = 60;

const GENERIC_LOGIN_ERROR =
  "Those sign-in details are not correct. Check your username and password, then try again.";

async function recordAuthAudit(userId: string, action: string): Promise<void> {
  try {
    await recordAudit({ userId, action, module: "auth" });
  } catch (error) {
    console.error("[auth] audit write failed", error);
  }
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse(formToObject(formData));
  if (!parsed.success) return actionErrorFromZod(parsed.error);

  const { username: identifier, password, next } = parsed.data;
  const meta = await getRequestMeta();

  try {
    const normalized = identifier.trim().toLowerCase();

    // Prefer university authentic (username). Email falls back for legacy/seed accounts.
    let authentic = !normalized.includes("@")
      ? await prisma.authentic.findFirst({
          where: { username: normalized },
        })
      : null;

    if (!authentic && normalized.includes("@")) {
      const byEmail = await prisma.user.findUnique({
        where: { email: normalized },
        select: { id: true, authentic: true },
      });
      authentic = byEmail?.authentic ?? null;
    }

    if (authentic) {
      const passwordMatches = await verifyPassword(
        password,
        authentic.pass || DUMMY_PASSWORD_HASH,
      );

      if (!passwordMatches) {
        if (authentic.userId) {
          await recordAuthAudit(authentic.userId, "LOGIN_FAILED");
        }
        return actionError(GENERIC_LOGIN_ERROR);
      }

      const user = await ensureUserFromAuthentic(authentic);

      if (user.status !== "ACTIVE") {
        return actionError(
          "This account has been deactivated. Please contact the administrator.",
        );
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: 0,
          lockedUntil: null,
          lastLoginAt: new Date(),
        },
      });

      await createSession(user.id, meta);
      await recordAuthAudit(user.id, "LOGIN");
    } else {
      // Legacy fallback: users without an authentic row (should be rare after seed/backfill).
      const userSelect = {
        id: true,
        passwordHash: true,
        status: true,
      } as const;

      const user = normalized.includes("@")
        ? await prisma.user.findUnique({
            where: { email: normalized },
            select: userSelect,
          })
        : await prisma.user.findFirst({
            where: {
              OR: [
                { username: normalized },
                { email: normalized },
              ],
            },
            select: userSelect,
          });

      const passwordMatches = await verifyPassword(
        password,
        user?.passwordHash ?? DUMMY_PASSWORD_HASH,
      );

      if (!user || !passwordMatches) {
        if (user) {
          await recordAuthAudit(user.id, "LOGIN_FAILED");
        }
        return actionError(GENERIC_LOGIN_ERROR);
      }

      if (user.status !== "ACTIVE") {
        return actionError(
          "This account has been deactivated. Please contact the administrator.",
        );
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: 0,
          lockedUntil: null,
          lastLoginAt: new Date(),
        },
      });

      await createSession(user.id, meta);
      await recordAuthAudit(user.id, "LOGIN");
    }
  } catch (error) {
    return toActionError(error);
  }

  const target =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  redirect(target);
}

export async function logoutAction(): Promise<void> {
  const userId = await destroySession();
  if (userId) {
    await recordAuthAudit(userId, "LOGOUT");
  }
  redirect("/login");
}

export async function requestPasswordResetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse(formToObject(formData));
  if (!parsed.success) return actionErrorFromZod(parsed.error);

  const { email } = parsed.data;

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, fullName: true, status: true },
    });

    if (user?.status === "ACTIVE") {
      const meta = await getRequestMeta();
      const token = generateToken();

      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000),
          ipAddress: meta.ipAddress,
        },
      });

      await recordAudit({
        userId: user.id,
        action: "PASSWORD_RESET_REQUESTED",
        module: "auth",
      });

      const link = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/reset-password?token=${token}`;
      if (!process.env.SMTP_HOST) {
        console.info(
          `\n[password reset] Reset link for ${user.email} (${user.fullName}):\n  ${link}\n`,
        );
      }
    }
  } catch (error) {
    return toActionError(error);
  }

  return actionSuccess(
    "If that email address belongs to a staff account, a reset link is on its way.",
  );
}

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse(formToObject(formData));
  if (!parsed.success) return actionErrorFromZod(parsed.error);

  const { token, password } = parsed.data;

  try {
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
      select: {
        id: true,
        userId: true,
        usedAt: true,
        expiresAt: true,
        user: { select: { email: true, status: true } },
      },
    });

    if (
      !record ||
      record.usedAt ||
      record.expiresAt < new Date() ||
      record.user.status !== "ACTIVE"
    ) {
      return actionError("This reset link is no longer valid.");
    }

    const passHash = await hashPassword(password);
    await syncPasswordHashes(record.userId, passHash);
    await prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    await revokeAllSessions(record.userId);
    await recordAudit({
      userId: record.userId,
      action: "PASSWORD_RESET",
      module: "auth",
    });

    return actionSuccess("Your password has been changed. You can now sign in.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = changePasswordSchema.safeParse(formToObject(formData));
  if (!parsed.success) return actionErrorFromZod(parsed.error);

  try {
    const user = await requireAuth();
    const record = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        passwordHash: true,
        authentic: { select: { pass: true } },
      },
    });

    const hashToCheck =
      record?.authentic?.pass ?? record?.passwordHash ?? DUMMY_PASSWORD_HASH;
    const matches = await verifyPassword(
      parsed.data.currentPassword,
      hashToCheck,
    );
    if (!matches) {
      return actionError("That is not your current password.", {
        currentPassword: ["That is not your current password"],
      });
    }

    await syncPasswordHashes(user.id, await hashPassword(parsed.data.password));

    await revokeAllSessions(user.id, user.sessionId);
    await recordAudit({
      userId: user.id,
      action: "CHANGE_PASSWORD",
      module: "auth",
    });

    revalidatePath("/settings/profile");
    return actionSuccess("Password changed.");
  } catch (error) {
    return toActionError(error);
  }
}
