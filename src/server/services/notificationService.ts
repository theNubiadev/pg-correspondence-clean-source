import "server-only";

import type { NotificationType } from "@prisma/client";

import { OVERDUE_AFTER_DAYS, PHYSICAL_ACK_AFTER_HOURS } from "@/lib/constants";
import { sendMail } from "@/lib/mail";
import { recipientsWithoutRecent } from "@/lib/notifications/dedupe";
import { prisma } from "@/lib/prisma";

const REMINDER_DEBOUNCE_MS = 24 * 60 * 60 * 1000;

function overdueCutoff(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - OVERDUE_AFTER_DAYS);
  return d;
}

async function unitStaff(officeId: string | null | undefined) {
  if (!officeId) return [];
  return prisma.user.findMany({
    where: {
      role: "DEPARTMENT_STAFF",
      status: "ACTIVE",
      destinationOfficeId: officeId,
    },
    select: { id: true, email: true, fullName: true },
  });
}

async function createForUsers(input: {
  users: { id: string; email: string; fullName: string }[];
  type: NotificationType;
  title: string;
  body: string;
  correspondenceId?: string | null;
  emailSubject?: string;
  email?: boolean;
}) {
  if (!input.users.length) return 0;

  await prisma.notification.createMany({
    data: input.users.map((user) => ({
      userId: user.id,
      type: input.type,
      title: input.title,
      body: input.body,
      correspondenceId: input.correspondenceId ?? null,
    })),
  });

  if (input.email !== false) {
    await Promise.all(
      input.users.map((user) =>
        sendMail({
          to: user.email,
          subject: input.emailSubject ?? input.title,
          text: `Dear ${user.fullName},\n\n${input.body}\n\n— PG School Correspondence Register`,
        }),
      ),
    );
  }

  return input.users.length;
}

async function provostAndAdmin() {
  return prisma.user.findMany({
    where: {
      status: "ACTIVE",
      role: { in: ["PROVOST_STAFF", "SUPER_ADMIN"] },
    },
    select: { id: true, email: true, fullName: true },
  });
}

async function sendingUnitStaff(officeId: string | null | undefined) {
  if (!officeId) return [];
  return unitStaff(officeId);
}

export const notificationService = {
  async listForUser(userId: string, take = 20) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        correspondence: {
          select: {
            id: true,
            referenceNumber: true,
            studentName: true,
            status: true,
          },
        },
      },
    });
  },

  async unreadCount(userId: string) {
    return prisma.notification.count({
      where: { userId, readAt: null },
    });
  },

  async markRead(userId: string, id: string) {
    await prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
  },

  async markAllRead(userId: string) {
    await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  },

  /**
   * When Provost directs a letter to a unit, every active officer of that unit
   * gets an internal alert (and email if SMTP is configured).
   */
  async notifyDirected(correspondenceId: string) {
    const letter = await prisma.correspondence.findUnique({
      where: { id: correspondenceId },
      select: {
        id: true,
        referenceNumber: true,
        studentName: true,
        subject: true,
        applicantType: true,
        destinationOfficeId: true,
        destinationOffice: { select: { officeName: true } },
      },
    });
    if (!letter?.destinationOfficeId || !letter.destinationOffice) return 0;

    const users = await unitStaff(letter.destinationOfficeId);
    const title = `${letter.referenceNumber} directed to ${letter.destinationOffice.officeName}`;
    const body = `A letter for ${letter.studentName} has been dispatched to your unit.\n\nSubject: ${letter.subject}\nOpen ${letter.referenceNumber} in the register when you attend to it.`;

    return createForUsers({
      users,
      type: "DIRECTED",
      title,
      body,
      correspondenceId: letter.id,
      emailSubject: `[PG Register] ${title}`,
    });
  },

  /**
   * Reminds unit staff about open letters that have sat longer than the working
   * turnaround. Idempotent: one reminder per user per letter per 24 hours.
   */
  async sweepUnattendedReminders(officeId?: string) {
    const stale = overdueCutoff();
    const since = new Date(Date.now() - REMINDER_DEBOUNCE_MS);

    const letters = await prisma.correspondence.findMany({
      where: {
        status: "DISPATCHED",
        dateReceived: { lt: stale },
        destinationOfficeId: { not: null },
        ...(officeId ? { destinationOfficeId: officeId } : {}),
      },
      select: {
        id: true,
        referenceNumber: true,
        studentName: true,
        subject: true,
        applicantType: true,
        destinationOfficeId: true,
        destinationOffice: { select: { officeName: true } },
        dateReceived: true,
      },
      take: 100,
    });

    let created = 0;

    for (const letter of letters) {
      if (!letter.destinationOfficeId) continue;
      const users = await unitStaff(letter.destinationOfficeId);
      if (!users.length) continue;

      const recent = await prisma.notification.findMany({
        where: {
          correspondenceId: letter.id,
          type: "UNATTENDED_REMINDER",
          userId: { in: users.map((u) => u.id) },
          createdAt: { gte: since },
        },
        select: { userId: true },
      });
      const recipients = recipientsWithoutRecent(
        users,
        recent.map((row) => row.userId),
      );
      if (!recipients.length) continue;

      const title = `Unattended: ${letter.referenceNumber}`;
      const officeName = letter.destinationOffice?.officeName ?? "your unit";
      const body = `${letter.referenceNumber} for ${letter.studentName} is still open in ${officeName} and has passed the ${OVERDUE_AFTER_DAYS}-day working turnaround.\n\nSubject: ${letter.subject}\nPlease attend to it or update its status.`;

      created += await createForUsers({
        users: recipients,
        type: "UNATTENDED_REMINDER",
        title,
        body,
        correspondenceId: letter.id,
        emailSubject: `[PG Register] ${title}`,
      });
    }

    return created;
  },

  async notifyClosed(correspondenceId: string) {
    const letter = await prisma.correspondence.findUnique({
      where: { id: correspondenceId },
      select: {
        id: true,
        referenceNumber: true,
        studentName: true,
        subject: true,
        destinationOffice: { select: { officeName: true } },
      },
    });
    if (!letter) return 0;

    const users = await prisma.user.findMany({
      where: {
        status: "ACTIVE",
        role: { in: ["PROVOST_STAFF", "SUPER_ADMIN"] },
      },
      select: { id: true, email: true, fullName: true },
    });

    const office = letter.destinationOffice?.officeName ?? "a unit";
    const title = `${letter.referenceNumber} closed`;
    const body = `${letter.referenceNumber} for ${letter.studentName} was closed after dispatch to ${office}.\n\nSubject: ${letter.subject}`;

    return createForUsers({
      users,
      type: "CLOSED",
      title,
      body,
      correspondenceId: letter.id,
      emailSubject: `[PG Register] ${title}`,
    });
  },

  async notifyHandoffAwaiting(correspondenceId: string) {
    const letter = await prisma.correspondence.findUnique({
      where: { id: correspondenceId },
      include: {
        destinationOffice: { select: { officeName: true } },
        handoffs: {
          where: { current: true },
          take: 1,
        },
      },
    });
    const handoff = letter?.handoffs[0];
    if (!letter?.destinationOfficeId || !handoff || handoff.state !== "PENDING") {
      return 0;
    }
    const users = await unitStaff(letter.destinationOfficeId);
    return createForUsers({
      users,
      type: "HANDOFF_AWAITING",
      title: `${letter.referenceNumber} awaiting physical receipt`,
      body: `A virtual record has been sent to ${letter.destinationOffice?.officeName ?? "your unit"}. Confirm that the physical copy has arrived, or flag that it has not.`,
      correspondenceId: letter.id,
      email: false,
    });
  },

  async notifyPhysicalReceived(correspondenceId: string) {
    const letter = await prisma.correspondence.findUnique({
      where: { id: correspondenceId },
      include: {
        destinationOffice: { select: { officeName: true } },
        handoffs: {
          where: { current: true },
          take: 1,
        },
      },
    });
    if (!letter) return 0;
    const handoff = letter.handoffs[0];
    const recipients = [
      ...(await provostAndAdmin()),
      ...(await sendingUnitStaff(handoff?.fromOfficeId)),
    ];
    const unique = new Map(recipients.map((user) => [user.id, user]));
    const office = letter.destinationOffice?.officeName ?? "A unit";
    return createForUsers({
      users: [...unique.values()],
      type: "PHYSICAL_RECEIVED",
      title: `${letter.referenceNumber} physical copy received`,
      body: `${office} confirmed that the physical copy of ${letter.referenceNumber} has been received in full.`,
      correspondenceId: letter.id,
      email: false,
    });
  },

  async notifyPhysicalNotReceived(correspondenceId: string) {
    const letter = await prisma.correspondence.findUnique({
      where: { id: correspondenceId },
      include: {
        destinationOffice: { select: { officeName: true } },
        handoffs: {
          where: { current: true },
          take: 1,
        },
      },
    });
    if (!letter) return 0;
    const handoff = letter.handoffs[0];
    const recipients = [
      ...(await provostAndAdmin()),
      ...(await sendingUnitStaff(handoff?.fromOfficeId)),
    ];
    const unique = new Map(recipients.map((user) => [user.id, user]));
    return createForUsers({
      users: [...unique.values()],
      type: "PHYSICAL_NOT_RECEIVED",
      title: `${letter.referenceNumber} physical copy not received`,
      body: `${letter.destinationOffice?.officeName ?? "A unit"} reported that the physical copy of ${letter.referenceNumber} has not arrived.`,
      correspondenceId: letter.id,
      email: false,
    });
  },

  async notifyPhysicalResent(correspondenceId: string) {
    const letter = await prisma.correspondence.findUnique({
      where: { id: correspondenceId },
      include: { destinationOffice: { select: { officeName: true } } },
    });
    if (!letter?.destinationOfficeId) return 0;
    return createForUsers({
      users: await unitStaff(letter.destinationOfficeId),
      type: "PHYSICAL_RESENT",
      title: `${letter.referenceNumber} physical copy resent`,
      body: `The physical copy of ${letter.referenceNumber} has been marked as resent to ${letter.destinationOffice?.officeName ?? "your unit"}. Confirm receipt when it arrives.`,
      correspondenceId: letter.id,
      email: false,
    });
  },

  async notifyVirtualRecordMissing(reportId: string) {
    const report = await prisma.physicalOrphanReport.findUnique({
      where: { id: reportId },
      include: {
        reportingOffice: { select: { officeName: true } },
        sendingOffice: { select: { officeName: true } },
      },
    });
    if (!report) return 0;
    const recipients = [
      ...(await provostAndAdmin()),
      ...(await sendingUnitStaff(report.sendingOfficeId)),
    ];
    const unique = new Map(recipients.map((user) => [user.id, user]));
    return createForUsers({
      users: [...unique.values()],
      type: "VIRTUAL_RECORD_MISSING",
      title: `Physical copy reported without a register entry`,
      body: `${report.reportingOffice.officeName} received a physical letter${report.referenceHint ? ` (${report.referenceHint})` : ""} that is not on the system.`,
      correspondenceId: report.linkedCorrespondenceId,
      email: false,
    });
  },

  async notifyDiscrepancyResolved(reportId: string) {
    const report = await prisma.physicalOrphanReport.findUnique({
      where: { id: reportId },
      include: { reportingOffice: { select: { officeName: true } } },
    });
    if (!report) return 0;
    return createForUsers({
      users: await unitStaff(report.reportingOfficeId),
      type: "DISCREPANCY_RESOLVED",
      title: "Missing-register report resolved",
      body: `The physical-copy report from ${report.reportingOffice.officeName} has been resolved.`,
      correspondenceId: report.linkedCorrespondenceId,
      email: false,
    });
  },

  async sweepHandoffReminders(officeId?: string) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const stale = new Date(
      Date.now() - PHYSICAL_ACK_AFTER_HOURS * 60 * 60 * 1000,
    );
    const handoffs = await prisma.correspondenceHandoff.findMany({
      where: {
        current: true,
        state: { in: ["PENDING", "NOT_RECEIVED"] },
        virtualSentAt: { lt: stale },
        ...(officeId ? { toOfficeId: officeId } : {}),
      },
      include: {
        correspondence: {
          select: { id: true, referenceNumber: true, studentName: true },
        },
        toOffice: { select: { officeName: true } },
      },
      take: 100,
    });

    let created = 0;
    for (const handoff of handoffs) {
      const users =
        handoff.state === "NOT_RECEIVED"
          ? [
              ...(await provostAndAdmin()),
              ...(await sendingUnitStaff(handoff.fromOfficeId)),
            ]
          : await unitStaff(handoff.toOfficeId);
      const unique = [...new Map(users.map((user) => [user.id, user])).values()];
      if (!unique.length) continue;
      const recent = await prisma.notification.findMany({
        where: {
          correspondenceId: handoff.correspondenceId,
          type: "HANDOFF_OVERDUE",
          userId: { in: unique.map((user) => user.id) },
          createdAt: { gte: since },
        },
        select: { userId: true },
      });
      const recipients = recipientsWithoutRecent(
        unique,
        recent.map((row) => row.userId),
      );
      if (!recipients.length) continue;
      created += await createForUsers({
        users: recipients,
        type: "HANDOFF_OVERDUE",
        title:
          handoff.state === "NOT_RECEIVED"
            ? `Still missing: ${handoff.correspondence.referenceNumber}`
            : `Acknowledge ${handoff.correspondence.referenceNumber}`,
        body:
          handoff.state === "NOT_RECEIVED"
            ? `${handoff.toOffice.officeName} has still not received the physical copy of ${handoff.correspondence.referenceNumber}.`
            : `${handoff.correspondence.referenceNumber} is still awaiting physical-copy confirmation in ${handoff.toOffice.officeName}.`,
        correspondenceId: handoff.correspondenceId,
        email: false,
      });
    }
    return created;
  },
};
