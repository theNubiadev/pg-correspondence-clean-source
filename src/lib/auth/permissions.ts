import type { CorrespondenceStatus, PhysicalReceiptState, UserRole } from "@prisma/client";

import type { CurrentUser } from "@/lib/auth/session";

/** Super Admin: users, settings, audit logs, college-wide read, corrections. */
export function canManageSystem(user: CurrentUser): boolean {
  return user.role === "SUPER_ADMIN" && user.status === "ACTIVE";
}

export function isSuperAdmin(user: CurrentUser): boolean {
  return user.role === "SUPER_ADMIN";
}

export function isProvostStaff(user: CurrentUser): boolean {
  return user.role === "PROVOST_STAFF";
}

/** Any active staff account may use the register within its scope. */
export function canUseRegister(user: CurrentUser): boolean {
  return user.status === "ACTIVE";
}

/** Any active Provost counter or unit staff may log a new letter. */
export function canCreateCorrespondence(user: CurrentUser): boolean {
  return (
    user.status === "ACTIVE" &&
    (user.role === "SUPER_ADMIN" ||
      user.role === "PROVOST_STAFF" ||
      user.role === "DEPARTMENT_STAFF")
  );
}

/**
 * Role may open the edit form at all. Per-letter checks use
 * {@link canEditCorrespondenceRecord}.
 */
export function canEditCorrespondence(user: CurrentUser): boolean {
  return canCreateCorrespondence(user);
}

/** Provost Office / admin only — not every account that can log mail. */
function canRunProvostPipeline(user: CurrentUser): boolean {
  return (
    user.status === "ACTIVE" &&
    (user.role === "SUPER_ADMIN" || user.role === "PROVOST_STAFF")
  );
}

/** Initial dispatch (Treated → Dispatched) stays with Provost Office. */
export function canDispatchCorrespondence(user: CurrentUser): boolean {
  return canRunProvostPipeline(user);
}

export function canAccessAllCorrespondence(user: CurrentUser): boolean {
  return user.role === "SUPER_ADMIN" || user.role === "PROVOST_STAFF";
}

export function isDepartmentStaff(user: CurrentUser): boolean {
  return user.role === "DEPARTMENT_STAFF";
}

export function isFinanceUnit(user: CurrentUser): boolean {
  return (
    user.role === "DEPARTMENT_STAFF" &&
    (user.destinationOfficeName?.trim().toLowerCase() === "finance" ||
      user.username.trim().toLowerCase() === "finance")
  );
}

/** Finance unit (and Super Admin) may search Finance PV numbers. */
export function canManageFinancePv(user: CurrentUser): boolean {
  if (user.status !== "ACTIVE") return false;
  return isSuperAdmin(user) || isFinanceUnit(user);
}

/**
 * Finance PV may be set only on letters assigned to Finance (or by Super Admin).
 */
export function canSetFinancePvOnLetter(
  user: CurrentUser,
  destinationOfficeId?: string | null,
): boolean {
  if (!canManageFinancePv(user)) return false;
  if (isSuperAdmin(user)) return true;
  return isAssignedUnit(user, destinationOfficeId);
}

function isAssignedUnit(
  user: CurrentUser,
  destinationOfficeId?: string | null,
): boolean {
  return Boolean(
    user.destinationOfficeId &&
      destinationOfficeId &&
      user.destinationOfficeId === destinationOfficeId,
  );
}

function canActOnAssignedLetter(
  user: CurrentUser,
  destinationOfficeId?: string | null,
): boolean {
  if (user.status !== "ACTIVE") return false;
  return (
    canAccessAllCorrespondence(user) ||
    isAssignedUnit(user, destinationOfficeId)
  );
}

/**
 * Units edit only letters they logged or that are currently assigned to them.
 * Provost / Super Admin may edit any open letter.
 */
export function canEditCorrespondenceRecord(
  user: CurrentUser,
  record: {
    createdById: string;
    destinationOfficeId?: string | null;
    status: CorrespondenceStatus;
  },
): boolean {
  if (user.status !== "ACTIVE") return false;
  if (record.status === "CLOSED") return false;
  if (canAccessAllCorrespondence(user)) return true;
  if (!isDepartmentStaff(user)) return false;
  return (
    record.createdById === user.id ||
    isAssignedUnit(user, record.destinationOfficeId)
  );
}

/** Re-route a dispatched letter after the receiving unit has acknowledged it. */
export function canForwardCorrespondence(
  user: CurrentUser,
  destinationOfficeId?: string | null,
): boolean {
  return canActOnAssignedLetter(user, destinationOfficeId);
}

/**
 * Advance one pipeline stage (Received → … → Treated). Dispatch is separate.
 */
export function canAdvanceCorrespondence(user: CurrentUser): boolean {
  return canRunProvostPipeline(user);
}

/** Park or resume Keep in view. */
export function canParkKiv(user: CurrentUser): boolean {
  return canRunProvostPipeline(user);
}

/** Daily, weekly and monthly returns. */
export function canViewReports(user: CurrentUser): boolean {
  return (
    user.status === "ACTIVE" &&
    (user.role === "SUPER_ADMIN" || user.role === "PROVOST_STAFF")
  );
}

/** Close a dispatched letter after physical receipt is confirmed. */
export function canCloseCorrespondence(
  user: CurrentUser,
  destinationOfficeId?: string | null,
): boolean {
  return canActOnAssignedLetter(user, destinationOfficeId);
}

/**
 * Confirm / flag physical receipt.
 * - Destination has unit staff → only that unit.
 * - No unit login (custom / empty office) → Provost / Super Admin confirm delivery.
 */
export function canAcknowledgeHandoff(
  user: CurrentUser,
  destinationOfficeId?: string | null,
  destinationHasUnitStaff = true,
): boolean {
  if (user.status !== "ACTIVE") return false;
  if (destinationHasUnitStaff) {
    return isAssignedUnit(user, destinationOfficeId);
  }
  return canAccessAllCorrespondence(user);
}

export function canReportOrphanPhysical(user: CurrentUser): boolean {
  return user.status === "ACTIVE" && isDepartmentStaff(user) && Boolean(user.destinationOfficeId);
}

export function canResolveOrphanPhysical(user: CurrentUser): boolean {
  return canRunProvostPipeline(user);
}

export function handoffAllowsForwardOrClose(
  handoffState?: PhysicalReceiptState | null,
  acknowledgementRequired = true,
): boolean {
  if (!acknowledgementRequired) return true;
  return handoffState === "RECEIVED";
}

/** Super Admin only: jump status with a recorded reason. */
export function canCorrectStatus(user: CurrentUser): boolean {
  return canManageSystem(user);
}

export function canManageRemarks(user: CurrentUser): boolean {
  return user.status === "ACTIVE";
}

/**
 * Actions a given user may take on a letter in its current status.
 */
export function allowedActionsFor(
  user: CurrentUser,
  status: CorrespondenceStatus,
  destinationOfficeId?: string | null,
  handoffState?: PhysicalReceiptState | null,
  options?: {
    acknowledgementRequired?: boolean;
    destinationHasUnitStaff?: boolean;
    createdById?: string;
  },
): {
  advance: boolean;
  dispatch: boolean;
  forward: boolean;
  parkKiv: boolean;
  resumeKiv: boolean;
  close: boolean;
  edit: boolean;
  correct: boolean;
  acknowledge: boolean;
  flagMissingPhysical: boolean;
  markResent: boolean;
} {
  const acknowledgementRequired = options?.acknowledgementRequired ?? true;
  const destinationHasUnitStaff = options?.destinationHasUnitStaff ?? true;
  const receiptOk = handoffAllowsForwardOrClose(
    handoffState,
    acknowledgementRequired,
  );
  const assigned = canActOnAssignedLetter(user, destinationOfficeId);
  const canAck = canAcknowledgeHandoff(
    user,
    destinationOfficeId,
    destinationHasUnitStaff,
  );

  return {
    advance:
      canAdvanceCorrespondence(user) &&
      status !== "KIV" &&
      status !== "DISPATCHED" &&
      status !== "CLOSED" &&
      status !== "TREATED",
    dispatch:
      canDispatchCorrespondence(user) && status === "TREATED",
    forward:
      canForwardCorrespondence(user, destinationOfficeId) &&
      status === "DISPATCHED" &&
      receiptOk,
    parkKiv:
      canParkKiv(user) && status !== "KIV" && status !== "CLOSED",
    resumeKiv: canParkKiv(user) && status === "KIV",
    close:
      canCloseCorrespondence(user, destinationOfficeId) &&
      status === "DISPATCHED" &&
      receiptOk,
    edit: options?.createdById
      ? canEditCorrespondenceRecord(user, {
          createdById: options.createdById,
          destinationOfficeId,
          status,
        })
      : canEditCorrespondence(user) && status !== "CLOSED",
    correct: canCorrectStatus(user) && status !== "CLOSED",
    acknowledge:
      canAck &&
      (status === "DISPATCHED" || status === "KIV") &&
      acknowledgementRequired &&
      handoffState === "PENDING",
    flagMissingPhysical:
      canAck &&
      destinationHasUnitStaff &&
      (status === "DISPATCHED" || status === "KIV") &&
      acknowledgementRequired &&
      handoffState === "PENDING",
    markResent:
      canAccessAllCorrespondence(user) &&
      (status === "DISPATCHED" || status === "KIV") &&
      handoffState === "NOT_RECEIVED",
  };
}

/**
 * Register, search and export are college-wide for every active staff account.
 * Assignment filtering is a dashboard concern, not a read restriction.
 */
export function scopeForUser(_user: CurrentUser): {
  destinationOfficeId?: string;
} {
  return {};
}

/**
 * Unit dashboards stay assigned-only. If a unit account has no office, scope
 * to an impossible id so the queue is empty rather than college-wide.
 */
export function dashboardScopeForUser(user: CurrentUser): {
  destinationOfficeId?: string;
} {
  if (!isDepartmentStaff(user)) return {};
  return {
    destinationOfficeId:
      user.destinationOfficeId ?? "__no_department_assigned__",
  };
}

/** Office id used for dashboard/shell counts; undefined means Provost-wide. */
export function dashboardOfficeId(user: CurrentUser): string | undefined {
  return dashboardScopeForUser(user).destinationOfficeId;
}

export function roleLabel(role: UserRole): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "Super Administrator";
    case "PROVOST_STAFF":
      return "Provost Staff";
    case "DEPARTMENT_STAFF":
      return "Unit Staff";
    default:
      return role;
  }
}
