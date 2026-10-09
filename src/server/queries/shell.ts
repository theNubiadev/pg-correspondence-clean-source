import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/prisma";
import { registerViewWhere } from "@/lib/register-views";
import { notificationService } from "@/server/services/notificationService";

/**
 * Live figures shown as badges beside the navigation.
 *
 * The sidebar is on screen all day, so putting the two numbers that decide what
 * someone does next — what is waiting, what has gone stale — directly on it
 * saves a trip to the dashboard for the most common question in the office.
 */
export type ShellCounts = {
  awaiting: number;
  overdue: number;
  unreadNotifications: number;
};

export const getShellCounts = cache(
  async (officeId?: string, userId?: string): Promise<ShellCounts> => {
    const scope = officeId ? { destinationOfficeId: officeId } : {};
    // Unit staff: "awaiting" means physical copies not yet confirmed.
    // Provost/admin: logged letters waiting for Provost action.
    const awaitingKey = officeId ? "physical-awaiting" : "awaiting";

    const [awaiting, overdue, unreadNotifications] = await Promise.all([
      prisma.correspondence.count({
        where: { ...scope, AND: [registerViewWhere(awaitingKey)] },
      }),
      prisma.correspondence.count({
        where: { ...scope, AND: [registerViewWhere("overdue")] },
      }),
      userId ? notificationService.unreadCount(userId) : Promise.resolve(0),
    ]);

    return { awaiting, overdue, unreadNotifications };
  },
);

export const getShellNotifications = cache(async (userId: string) => {
  return notificationService.listForUser(userId, 12);
});

export const getActiveDestinationOffices = cache(async () => {
  const { destinationOfficeRepository } = await import(
    "@/server/repositories/destinationOfficeRepository"
  );
  return destinationOfficeRepository.list(true);
});
