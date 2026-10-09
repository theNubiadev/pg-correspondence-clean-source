import "server-only";

import { cache } from "react";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { AdminOversight, DashboardSummary } from "@/lib/admin-oversight-types";
import { OPEN_STATUSES, OVERDUE_AFTER_DAYS, STATUS_META } from "@/lib/constants";
import { correspondenceRepository } from "@/server/repositories/correspondenceRepository";
import { destinationOfficeRepository } from "@/server/repositories/destinationOfficeRepository";
import { settingsRepository } from "@/server/repositories/settingsRepository";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function officeWhere(officeId?: string): Prisma.CorrespondenceWhereInput {
  return officeId ? { destinationOfficeId: officeId } : {};
}

/** Letters received before this moment are overdue if still open. */
function overdueCutoff(): Date {
  const d = startOfToday();
  d.setDate(d.getDate() - OVERDUE_AFTER_DAYS);
  return d;
}

export type { AdminOversight, DashboardSummary } from "@/lib/admin-oversight-types";

/**
 * The numbers the dashboard is built around.
 *
 * These are deliberately operational rather than statistical: a registry clerk
 * needs to know what is waiting on them today, not the all-time total. The
 * all-time total is included only as context.
 */
export const getDashboardSummary = cache(
  async (officeId?: string): Promise<DashboardSummary> => {
    const today = startOfToday();
    const stale = overdueCutoff();
    const where = officeWhere(officeId);

    const [
      total,
      incomingToday,
      awaitingAction,
      inProgress,
      kiv,
      overdue,
      completedToday,
      completed,
      closed,
      physicalAwaiting,
      physicalNotReceived,
      orphanOpen,
    ] = await prisma.$transaction([
      prisma.correspondence.count({ where }),
      prisma.correspondence.count({
        where: { ...where, dateReceived: { gte: today } },
      }),
      prisma.correspondence.count({
        where: {
          ...where,
          status: { in: ["RECEIVED", "AWAITING_PROVOST_ACTION"] },
        },
      }),
      prisma.correspondence.count({ where: { ...where, status: "TREATED" } }),
      prisma.correspondence.count({ where: { ...where, status: "KIV" } }),
      prisma.correspondence.count({
        where: {
          ...where,
          status: { in: OPEN_STATUSES },
          dateReceived: { lt: stale },
        },
      }),
      prisma.correspondence.count({
        where: { ...where, status: "DISPATCHED", updatedAt: { gte: today } },
      }),
      prisma.correspondence.count({ where: { ...where, status: "DISPATCHED" } }),
      prisma.correspondence.count({ where: { ...where, status: "CLOSED" } }),
      prisma.correspondenceHandoff.count({
        where: {
          current: true,
          state: "PENDING",
          ...(officeId ? { toOfficeId: officeId } : {}),
        },
      }),
      prisma.correspondenceHandoff.count({
        where: {
          current: true,
          state: "NOT_RECEIVED",
          ...(officeId ? { toOfficeId: officeId } : {}),
        },
      }),
      prisma.physicalOrphanReport.count({
        where: {
          status: "OPEN",
          ...(officeId ? { reportingOfficeId: officeId } : {}),
        },
      }),
    ]);

    return {
      total,
      incomingToday,
      awaitingAction,
      inProgress,
      kiv,
      overdue,
      completedToday,
      completed,
      closed,
      open: awaitingAction + inProgress + kiv,
      overdueAfterDays: OVERDUE_AFTER_DAYS,
      physicalAwaiting,
      physicalNotReceived,
      orphanOpen,
    };
  },
);

export const getStatusBreakdown = cache(async (officeId?: string) => {
  const groups = await correspondenceRepository.groupByStatus(officeWhere(officeId));
  return groups
    .map((g) => ({
      status: g.status,
      label: STATUS_META[g.status].label,
      count: g._count._all,
      token: STATUS_META[g.status].token,
    }))
    .sort((a, b) => STATUS_META[a.status].order - STATUS_META[b.status].order);
});

export const getDestinationOfficeBreakdown = cache(async (officeId?: string) => {
  const where = officeWhere(officeId);
  const [groups, offices] = await Promise.all([
    correspondenceRepository.groupByDestinationOffice(where),
    destinationOfficeRepository.list(),
  ]);

  const officeMap = new Map(offices.map((o) => [o.id, o.officeName]));

  return groups
    .filter((g): g is typeof g & { destinationOfficeId: string } =>
      Boolean(g.destinationOfficeId),
    )
    .map((g) => ({
      id: g.destinationOfficeId,
      name: officeMap.get(g.destinationOfficeId) ?? "Unknown",
      count: g._count._all,
    }))
    .sort((a, b) => b.count - a.count);
});

export const getRecentCorrespondence = cache(async (take = 8, officeId?: string) => {
  return correspondenceRepository.recent(take, officeWhere(officeId));
});

/** Open letters: unit queues newest-assigned first, Provost queue oldest first. */
export const getActionQueue = cache(async (take = 12, officeId?: string) => {
  return correspondenceRepository.openQueue(take, officeWhere(officeId), {
    newestAssignedFirst: Boolean(officeId),
  });
});

/** Most recently touched letters, for the "latest updates" rail. */
export const getRecentStatusUpdates = cache(async (take = 6, officeId?: string) => {
  return correspondenceRepository.recentlyUpdated(take, officeWhere(officeId));
});

/** Recently completed or closed letters — fills a sparse open queue. */
export const getRecentlySettled = cache(async (take = 5, officeId?: string) => {
  return correspondenceRepository.recentlySettled(take, officeWhere(officeId));
});

export const getUnitHandoffQueues = cache(async (officeId: string) => {
  const [notReceived, awaitingAck, orphans] = await Promise.all([
    prisma.correspondence.findMany({
      where: {
        destinationOfficeId: officeId,
        handoffs: { some: { current: true, state: "NOT_RECEIVED" } },
      },
      orderBy: [{ dateSentToOffice: "desc" }, { createdAt: "desc" }],
      take: 12,
      include: {
        destinationOffice: { select: { id: true, officeName: true } },
        createdBy: { select: { id: true, fullName: true } },
        handoffs: {
          where: { current: true },
          take: 1,
          include: {
            toOffice: { select: { id: true, officeName: true } },
            fromOffice: { select: { id: true, officeName: true } },
          },
        },
      },
    }),
    prisma.correspondence.findMany({
      where: {
        destinationOfficeId: officeId,
        handoffs: { some: { current: true, state: "PENDING" } },
      },
      orderBy: [{ dateSentToOffice: "desc" }, { createdAt: "desc" }],
      take: 12,
      include: {
        destinationOffice: { select: { id: true, officeName: true } },
        createdBy: { select: { id: true, fullName: true } },
        handoffs: {
          where: { current: true },
          take: 1,
          include: {
            toOffice: { select: { id: true, officeName: true } },
            fromOffice: { select: { id: true, officeName: true } },
          },
        },
      },
    }),
    prisma.physicalOrphanReport.findMany({
      where: { reportingOfficeId: officeId, status: "OPEN" },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);
  return { notReceived, awaitingAck, orphans };
});

export const getOpenOrphans = cache(async () => {
  return prisma.physicalOrphanReport.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    take: 12,
    include: {
      reportingOffice: { select: { officeName: true } },
      sendingOffice: { select: { officeName: true } },
    },
  });
});

export const getAppSettings = cache(async () => {
  return settingsRepository.getAll();
});

export const getActiveOffices = cache(async () => {
  return destinationOfficeRepository.list(true);
});

export const getOpenCorrespondenceCount = cache(async (officeId?: string) => {
  return prisma.correspondence.count({
    where: {
      ...officeWhere(officeId),
      status: { in: OPEN_STATUSES },
    },
  });
});

/**
 * College-wide figures for Super Admin — staff, units and register health.
 * Distinct from the Provost counter dashboard.
 */
export const getAdminOversight = cache(async (): Promise<AdminOversight> => {
  const stale = overdueCutoff();

  const [
    offices,
    staffTotal,
    staffActive,
    staffInactive,
    staffAdmins,
    staffProvost,
    staffUnits,
    neverLoggedIn,
    staffByOffice,
    openByOffice,
    overdueByOffice,
    recentLogins,
    recentAudit,
  ] = await Promise.all([
    destinationOfficeRepository.list(),
    prisma.user.count(),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { status: "INACTIVE" } }),
    prisma.user.count({ where: { role: "SUPER_ADMIN", status: "ACTIVE" } }),
    prisma.user.count({ where: { role: "PROVOST_STAFF", status: "ACTIVE" } }),
    prisma.user.count({
      where: { role: "DEPARTMENT_STAFF", status: "ACTIVE" },
    }),
    prisma.user.count({
      where: { status: "ACTIVE", lastLoginAt: null },
    }),
    prisma.user.groupBy({
      by: ["destinationOfficeId"],
      where: { status: "ACTIVE", destinationOfficeId: { not: null } },
      _count: { _all: true },
    }),
    prisma.correspondence.groupBy({
      by: ["destinationOfficeId"],
      where: { status: { in: OPEN_STATUSES } },
      _count: { _all: true },
    }),
    prisma.correspondence.groupBy({
      by: ["destinationOfficeId"],
      where: {
        status: { in: OPEN_STATUSES },
        dateReceived: { lt: stale },
      },
      _count: { _all: true },
    }),
    prisma.user.findMany({
      where: { lastLoginAt: { not: null } },
      orderBy: { lastLoginAt: "desc" },
      take: 8,
      select: {
        id: true,
        fullName: true,
        username: true,
        lastLoginAt: true,
        destinationOffice: { select: { officeName: true } },
      },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        action: true,
        module: true,
        createdAt: true,
        user: { select: { fullName: true } },
      },
    }),
  ]);

  const staffMap = new Map(
    staffByOffice
      .filter((g) => g.destinationOfficeId)
      .map((g) => [g.destinationOfficeId as string, g._count._all]),
  );
  const openMap = new Map(
    openByOffice.map((g) => [g.destinationOfficeId, g._count._all]),
  );
  const overdueMap = new Map(
    overdueByOffice.map((g) => [g.destinationOfficeId, g._count._all]),
  );

  return {
    staff: {
      total: staffTotal,
      active: staffActive,
      inactive: staffInactive,
      admins: staffAdmins,
      provost: staffProvost,
      unitStaff: staffUnits,
      neverLoggedIn,
    },
    offices: offices.map((office) => ({
      id: office.id,
      name: office.officeName,
      active: office.status === "ACTIVE",
      staff: staffMap.get(office.id) ?? 0,
      open: openMap.get(office.id) ?? 0,
      overdue: overdueMap.get(office.id) ?? 0,
    })),
    recentLogins: recentLogins.map((user) => ({
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      lastLoginAt: user.lastLoginAt,
      officeName: user.destinationOffice?.officeName ?? null,
    })),
    recentAudit: recentAudit.map((entry) => ({
      id: entry.id,
      action: entry.action,
      module: entry.module,
      createdAt: entry.createdAt,
      userName: entry.user?.fullName ?? null,
    })),
  };
});
