import "server-only";

import { redirect } from "next/navigation";

import { getCurrentUser, type CurrentUser } from "@/lib/auth/session";
import {
  canAccessAllCorrespondence,
  canCreateCorrespondence,
  canDispatchCorrespondence,
  canEditCorrespondence,
  canManageSystem,
  canUseRegister,
  canViewReports,
} from "@/lib/auth/permissions";

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class UnauthenticatedError extends Error {
  constructor(message = "Your session has expired. Please sign in again.") {
    super(message);
    this.name = "UnauthenticatedError";
  }
}

export async function requireUser(redirectTo?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    // Route through /logout so a stale cookie is revoked and cleared before
    // the visitor lands on /login — otherwise middleware would keep bouncing
    // a well-formed but dead token between /login and the protected area.
    const target = redirectTo
      ? `/logout?next=${encodeURIComponent(redirectTo)}`
      : "/logout";
    redirect(target);
  }
  return user;
}

export async function requireAuth(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthenticatedError();
  return user;
}

export async function requireRegisterAccess(): Promise<CurrentUser> {
  const user = await requireAuth();
  if (!canUseRegister(user)) {
    throw new ForbiddenError("Your account is not active.");
  }
  return user;
}

export async function requireSystemAdmin(): Promise<CurrentUser> {
  const user = await requireAuth();
  if (!canManageSystem(user)) {
    throw new ForbiddenError("This action requires Super Administrator access.");
  }
  return user;
}

export async function requireAdminPage(redirectTo?: string): Promise<CurrentUser> {
  const user = await requireUser(redirectTo);
  if (!canManageSystem(user)) redirect("/forbidden");
  return user;
}

export async function requireRegisterPage(
  redirectTo?: string,
): Promise<CurrentUser> {
  const user = await requireUser(redirectTo);
  if (!canUseRegister(user)) redirect("/forbidden");
  return user;
}

export async function requireCreateAccess(): Promise<CurrentUser> {
  const user = await requireAuth();
  if (!canCreateCorrespondence(user)) {
    throw new ForbiddenError("Only Provost Office staff can log correspondence.");
  }
  return user;
}

export async function requireEditAccess(): Promise<CurrentUser> {
  const user = await requireAuth();
  if (!canEditCorrespondence(user)) {
    throw new ForbiddenError("Only Provost Office staff can edit correspondence.");
  }
  return user;
}

export async function requireDispatchAccess(): Promise<CurrentUser> {
  const user = await requireAuth();
  if (!canDispatchCorrespondence(user)) {
    throw new ForbiddenError("Your account cannot route correspondence.");
  }
  return user;
}

export async function requireCreatePage(redirectTo?: string): Promise<CurrentUser> {
  const user = await requireUser(redirectTo);
  if (!canCreateCorrespondence(user)) redirect("/forbidden");
  return user;
}

export async function requireEditPage(redirectTo?: string): Promise<CurrentUser> {
  const user = await requireUser(redirectTo);
  if (!canEditCorrespondence(user)) redirect("/forbidden");
  return user;
}

export async function requireDispatchPage(redirectTo?: string): Promise<CurrentUser> {
  const user = await requireUser(redirectTo);
  if (!canDispatchCorrespondence(user)) redirect("/forbidden");
  return user;
}

export async function requireReportsPage(redirectTo?: string): Promise<CurrentUser> {
  const user = await requireUser(redirectTo);
  if (!canViewReports(user)) redirect("/forbidden");
  return user;
}

export function assertCorrespondenceAccess(
  user: CurrentUser,
  destinationOfficeId: string | null | undefined,
): void {
  if (canAccessAllCorrespondence(user)) return;
  if (
    destinationOfficeId &&
    user.destinationOfficeId &&
    user.destinationOfficeId === destinationOfficeId
  ) {
    return;
  }
  throw new ForbiddenError(
    "This correspondence is assigned to another department.",
  );
}
