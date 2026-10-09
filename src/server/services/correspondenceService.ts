import "server-only";

import type {
  CorrespondenceEventType,
  CorrespondenceStatus,
  Prisma,
} from "@prisma/client";

import { recordAudit } from "@/lib/audit";
import { nextStatus, STATUS_META } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { allocateReference } from "@/lib/reference";
import {
  canAcknowledgeHandoff,
  canAccessAllCorrespondence,
  canCloseCorrespondence,
  canForwardCorrespondence,
  canResolveOrphanPhysical,
  handoffAllowsForwardOrClose,
} from "@/lib/auth/permissions";
import type { CurrentUser } from "@/lib/auth/session";
import {
  assertCanAdvance,
  assertCanClose,
  assertCanCorrect,
  assertCanDispatch,
  assertCanForward,
  assertCanParkKiv,
  assertCanResumeKiv,
  assertTransition,
} from "@/lib/workflow/transitions";
import {
  correspondenceRepository,
  type CorrespondenceSearchParams,
} from "@/server/repositories/correspondenceRepository";
import { notificationService } from "@/server/services/notificationService";

export type CreateCorrespondenceInput = {
  studentName: string;
  matricNumber: string;
  faculty: string;
  department: string;
  staffId: string | null;
  phoneNumber?: string;
  applicantType: "STUDENT" | "STAFF" | "UNIT" | "EXTERNAL" | "OTHERS";
  onBehalfOf?: string | null;
  addresseeName?: string | null;
  batchNumber?: string | null;
  subject: string;
  remarks?: string | null;
  dateReceived: Date;
  status: CorrespondenceStatus;
  createdById: string;
};

export type UpdateCorrespondenceInput = {
  studentName: string;
  matricNumber: string;
  faculty: string;
  department: string;
  staffId: string | null;
  phoneNumber?: string;
  applicantType: "STUDENT" | "STAFF" | "UNIT" | "EXTERNAL" | "OTHERS";
  onBehalfOf?: string | null;
  addresseeName?: string | null;
  batchNumber?: string | null;
  subject: string;
  remarks?: string | null;
  comment: string;
  dateReceived: Date;
  dateSentToOffice?: Date | null;
  destinationOfficeId?: string | null;
};

export type DispatchCorrespondenceInput = {
  destinationOfficeId?: string;
  customDestination?: string;
  dateSentToOffice: Date;
  comment: string;
};

type EventInput = {
  correspondenceId: string;
  actorId: string | null;
  type: CorrespondenceEventType;
  fromStatus?: CorrespondenceStatus | null;
  toStatus?: CorrespondenceStatus | null;
  fromOfficeId?: string | null;
  toOfficeId?: string | null;
  note?: string | null;
  metadata?: Record<string, unknown> | null;
  tx?: Prisma.TransactionClient;
};

async function recordEvent(input: EventInput) {
  const client = input.tx ?? prisma;
  return client.correspondenceEvent.create({
    data: {
      correspondenceId: input.correspondenceId,
      actorId: input.actorId,
      type: input.type,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus ?? null,
      fromOfficeId: input.fromOfficeId ?? null,
      toOfficeId: input.toOfficeId ?? null,
      note: input.note?.trim() || null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });
}

async function officeHasUnitStaff(
  officeId: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  const count = await tx.user.count({
    where: {
      destinationOfficeId: officeId,
      role: "DEPARTMENT_STAFF",
      status: "ACTIVE",
    },
  });
  return count > 0;
}

export async function destinationHasUnitStaff(officeId: string | null | undefined) {
  if (!officeId) return false;
  return officeHasUnitStaff(officeId);
}

async function currentHandoff(
  correspondenceId: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return tx.correspondenceHandoff.findFirst({
    where: { correspondenceId, current: true },
    include: {
      toOffice: { select: { id: true, officeName: true } },
      fromOffice: { select: { id: true, officeName: true } },
    },
  });
}

function fail(decision: { ok: true } | { ok: false; reason: string }): void {
  if (!decision.ok) throw new Error(decision.reason);
}

export const correspondenceService = {
  search(params: CorrespondenceSearchParams) {
    return correspondenceRepository.search(params);
  },

  getById(id: string) {
    return correspondenceRepository.findById(id);
  },

  async listEvents(correspondenceId: string) {
    try {
      const [rows, offices] = await Promise.all([
        prisma.$queryRaw<
          Array<{
            id: string;
            type: CorrespondenceEventType;
            fromStatus: CorrespondenceStatus | null;
            toStatus: CorrespondenceStatus | null;
            fromOfficeId: string | null;
            toOfficeId: string | null;
            note: string | null;
            createdAt: Date;
            actorId: string | null;
            actorName: string | null;
          }>
        >`
          SELECT
            e.id,
            e.type,
            e.from_status AS fromStatus,
            e.to_status AS toStatus,
            e.from_office_id AS fromOfficeId,
            e.to_office_id AS toOfficeId,
            e.note,
            e.created_at AS createdAt,
            e.actor_id AS actorId,
            u.full_name AS actorName
          FROM correspondence_events e
          LEFT JOIN users u ON u.id = e.actor_id
          WHERE e.correspondence_id = ${correspondenceId}
          ORDER BY e.created_at DESC
        `,
        prisma.destinationOffice.findMany({
          select: { id: true, officeName: true },
        }),
      ]);

      const officeName = new Map(
        offices.map((office) => [office.id, office.officeName]),
      );

      const mapped = rows.map((event) => {
        const namedTo = event.toOfficeId
          ? (officeName.get(event.toOfficeId) ?? null)
          : null;
        const namedFrom = event.fromOfficeId
          ? (officeName.get(event.fromOfficeId) ?? null)
          : null;

        return {
          id: event.id,
          type: event.type,
          fromStatus: event.fromStatus,
          toStatus: event.toStatus,
          note: event.note,
          createdAt: event.createdAt,
          actor: event.actorId
            ? { id: event.actorId, fullName: event.actorName ?? "Staff" }
            : null,
          fromOfficeName: namedFrom,
          toOfficeName: namedTo,
        };
      });

      // Drop duplicate handoff rows that repeat the same offices/note as
      // the dispatch/forward event just above them in the trail.
      return mapped.filter((event, index) => {
        if (event.type !== "HANDOFF_CREATED") return true;
        const sibling = mapped[index + 1] ?? mapped[index - 1];
        if (!sibling) return true;
        if (sibling.type !== "DISPATCHED" && sibling.type !== "FORWARDED") {
          return true;
        }
        return !(
          sibling.toOfficeName === event.toOfficeName &&
          sibling.fromOfficeName === event.fromOfficeName &&
          sibling.note === event.note
        );
      });
    } catch (error) {
      console.error("[correspondence] listEvents failed", error);
      return [];
    }
  },

  async create(input: CreateCorrespondenceInput) {
    fail(assertTransition("create", "RECEIVED", input.status));
    const year = input.dateReceived.getFullYear();

    try {
      return await prisma.$transaction(async (tx) => {
        const { sequence, reference } = await allocateReference(tx, year);

        const created = await tx.correspondence.create({
          data: {
            referenceNumber: reference,
            sequence,
            year,
            applicantType: input.applicantType,
            studentName: input.studentName,
            onBehalfOf: input.onBehalfOf?.trim() || null,
            addresseeName: input.addresseeName?.trim() || null,
            batchNumber: input.batchNumber?.trim() || null,
            matricNumber: input.matricNumber,
            faculty: input.faculty,
            department: input.department,
            staffId: input.staffId,
            phoneNumber: input.phoneNumber ?? "",
            subject: input.subject,
            remarks: input.remarks ?? null,
            dateReceived: input.dateReceived,
            dateSentToOffice: null,
            destinationOfficeId: null,
            status: input.status,
            createdById: input.createdById,
          },
          include: {
            destinationOffice: { select: { id: true, officeName: true } },
            createdBy: { select: { id: true, fullName: true } },
          },
        });

        await recordEvent({
          tx,
          correspondenceId: created.id,
          actorId: input.createdById,
          type: "CREATED",
          toStatus: created.status,
          note: input.remarks ?? null,
        });

        await recordAudit({
          userId: input.createdById,
          action: "CREATE_CORRESPONDENCE",
          module: "correspondence",
          details: created.id,
          tx,
        });

        return created;
      });
    } catch (error) {
      throw error;
    }
  },

  async update(id: string, input: UpdateCorrespondenceInput, userId: string) {
    const current = await correspondenceRepository.findById(id);
    if (!current) throw new Error("Correspondence not found.");
    if (current.status === "CLOSED") {
      throw new Error("Closed correspondence cannot be edited.");
    }

    const data: Parameters<typeof correspondenceRepository.update>[1] = {
      applicantType: input.applicantType,
      studentName: input.studentName,
      onBehalfOf: input.onBehalfOf?.trim() || null,
      addresseeName: input.addresseeName?.trim() || null,
      batchNumber: input.batchNumber?.trim() || null,
      matricNumber: input.matricNumber,
      faculty: input.faculty,
      department: input.department,
      staffId: input.staffId,
      phoneNumber: input.phoneNumber ?? current.phoneNumber,
      subject: input.subject,
      dateReceived: input.dateReceived,
    };

    if (input.remarks !== undefined) data.remarks = input.remarks;

    return prisma.$transaction(async (tx) => {
      const record = await tx.correspondence.update({
        where: { id },
        data,
        include: {
          destinationOffice: { select: { id: true, officeName: true } },
          createdBy: { select: { id: true, fullName: true } },
        },
      });

      await recordEvent({
        tx,
        correspondenceId: id,
        actorId: userId,
        type: "UPDATED",
        fromStatus: current.status,
        toStatus: current.status,
        note: input.comment,
      });

      await recordAudit({
        userId,
        action: "UPDATE_CORRESPONDENCE",
        module: "correspondence",
        details: id,
        tx,
      });

      return record;
    });
  },

  async setFinancePvNumber(
    id: string,
    pvNumber: string | null | undefined,
    userId: string,
  ) {
    const current = await correspondenceRepository.findById(id);
    if (!current) throw new Error("Correspondence not found.");
    if (current.status === "CLOSED") {
      throw new Error("Closed correspondence cannot be edited.");
    }

    const normalized = pvNumber?.trim() || null;

    try {
      return await prisma.$transaction(async (tx) => {
        const record = await tx.correspondence.update({
          where: { id },
          data: { pvNumber: normalized },
          include: {
            destinationOffice: { select: { id: true, officeName: true } },
            createdBy: { select: { id: true, fullName: true } },
          },
        });

        await recordEvent({
          tx,
          correspondenceId: id,
          actorId: userId,
          type: "UPDATED",
          fromStatus: current.status,
          toStatus: current.status,
          note: normalized
            ? `Finance PV number set to ${normalized}`
            : "Finance PV number cleared",
        });

        await recordAudit({
          userId,
          action: "SET_FINANCE_PV",
          module: "correspondence",
          details: id,
          tx,
        });

        return record;
      });
    } catch (error) {
      if (
        error instanceof Error &&
        /Unique constraint|pv_number/i.test(error.message)
      ) {
        throw new Error("That Finance PV number is already on another letter.");
      }
      throw error;
    }
  },

  async addAttachments(
    correspondenceId: string,
    userId: string,
    files: File[],
  ) {
    const current = await correspondenceRepository.findById(correspondenceId);
    if (!current) throw new Error("Correspondence not found.");
    const usable = files.filter((file) => file && file.size > 0);
    if (usable.length === 0) return [];

    const {
      assertValidAttachmentFiles,
      removeStoredAttachment,
      storeCorrespondenceFiles,
    } = await import("@/lib/attachments");

    // Validate before writing so create/dispatch can fail cleanly.
    await assertValidAttachmentFiles(usable);

    const saved = await storeCorrespondenceFiles(correspondenceId, usable);
    if (saved.length === 0) return [];

    try {
      await prisma.correspondenceAttachment.createMany({
        data: saved.map((file) => ({
          correspondenceId,
          fileName: file.fileName,
          storedName: file.storedName,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
          uploadedById: userId,
        })),
      });
    } catch (error) {
      for (const file of saved) {
        await removeStoredAttachment(correspondenceId, file.storedName);
      }
      throw error;
    }

    await recordAudit({
      userId,
      action: "ATTACH_CORRESPONDENCE_FILE",
      module: "correspondence",
      details: `${correspondenceId}:${saved.length}`,
    });

    return saved;
  },

  async advanceStatus(id: string, userId: string, comment: string) {
    const current = await correspondenceRepository.findById(id);
    if (!current) throw new Error("Correspondence not found.");
    fail(assertCanAdvance(current.status));

    const upcoming = nextStatus(current.status);
    if (!upcoming) throw new Error("This correspondence cannot be advanced.");
    if (upcoming === "DISPATCHED") throw new Error("DISPATCH_REQUIRED");

    return this.applyStatus(id, upcoming, userId, {
      type: "ADVANCED",
      audit: "CHANGE_STATUS",
      note: comment,
    });
  },

  async parkAsKiv(id: string, userId: string, comment: string) {
    const current = await correspondenceRepository.findById(id);
    if (!current) throw new Error("Correspondence not found.");
    fail(assertCanParkKiv(current.status));
    return this.applyStatus(id, "KIV", userId, {
      type: "PARKED_KIV",
      audit: "PARK_KIV",
      note: comment,
    });
  },

  async resumeFromKiv(id: string, userId: string, comment: string) {
    const current = await correspondenceRepository.findById(id);
    if (!current) throw new Error("Correspondence not found.");
    fail(assertCanResumeKiv(current.status));
    const resumeTo =
      current.statusBeforeKiv && current.statusBeforeKiv !== "KIV"
        ? current.statusBeforeKiv
        : "AWAITING_PROVOST_ACTION";
    return this.applyStatus(id, resumeTo, userId, {
      type: "RESUMED_KIV",
      audit: "CHANGE_STATUS",
      note: comment,
    });
  },

  async dispatch(
    id: string,
    input: DispatchCorrespondenceInput,
    user: CurrentUser,
  ) {
    const current = await correspondenceRepository.findById(id);
    if (!current) throw new Error("Correspondence not found.");

    const reforward = current.status === "DISPATCHED";
    fail(
      reforward
        ? assertCanForward(current.status)
        : assertCanDispatch(current.status),
    );

    if (reforward) {
      if (!canForwardCorrespondence(user, current.destinationOfficeId)) {
        throw new Error("You cannot send this letter to another unit.");
      }
      const openHandoff = await currentHandoff(id);
      if (openHandoff && !handoffAllowsForwardOrClose(openHandoff.state, true)) {
        throw new Error(
          "Confirm the physical copy before sending this letter on.",
        );
      }
    }

    if (input.dateSentToOffice < current.dateReceived) {
      throw new Error("It cannot leave before the date it was received.");
    }

    const destinationOfficeId = await resolveDestinationOfficeId(input);
    const office = await prisma.destinationOffice.findUnique({
      where: { id: destinationOfficeId },
      select: { id: true, status: true },
    });
    if (!office || office.status !== "ACTIVE") {
      throw new Error("Choose an active destination unit.");
    }
    if (reforward && destinationOfficeId === current.destinationOfficeId) {
      throw new Error("Choose a different unit to send this letter to.");
    }

    const record = await prisma.$transaction(async (tx) => {
      const changed = await tx.correspondence.updateMany({
        where: { id, status: current.status },
        data: {
          status: "DISPATCHED",
          statusBeforeKiv: null,
          dateSentToOffice: input.dateSentToOffice,
          destinationOfficeId,
        },
      });
      if (changed.count !== 1) {
        throw new Error("This letter changed while you were working. Refresh and try again.");
      }

      await tx.correspondenceHandoff.updateMany({
        where: { correspondenceId: id, current: true, releasedAt: null },
        data: { current: false, releasedAt: new Date() },
      });

      const event = await recordEvent({
        tx,
        correspondenceId: id,
        actorId: user.id,
        type: reforward ? "FORWARDED" : "DISPATCHED",
        fromStatus: current.status,
        toStatus: "DISPATCHED",
        fromOfficeId: current.destinationOfficeId,
        toOfficeId: destinationOfficeId,
        note: input.comment,
      });

      await tx.correspondenceHandoff.create({
        data: {
          correspondenceId: id,
          correspondenceEventId: event.id,
          fromOfficeId: current.destinationOfficeId,
          toOfficeId: destinationOfficeId,
          sentById: user.id,
          virtualSentAt: input.dateSentToOffice,
          state: "PENDING",
          current: true,
          acknowledgedAt: null,
          acknowledgedById: null,
          note: null,
        },
      });

      await recordEvent({
        tx,
        correspondenceId: id,
        actorId: user.id,
        type: "HANDOFF_CREATED",
        fromStatus: current.status,
        toStatus: "DISPATCHED",
        fromOfficeId: current.destinationOfficeId,
        toOfficeId: destinationOfficeId,
        note: input.comment,
      });

      await recordAudit({
        userId: user.id,
        action: reforward ? "FORWARD_CORRESPONDENCE" : "DISPATCH_CORRESPONDENCE",
        module: "correspondence",
        details: id,
        tx,
      });

      return tx.correspondence.findUniqueOrThrow({
        where: { id },
        include: {
          destinationOffice: { select: { id: true, officeName: true } },
          createdBy: { select: { id: true, fullName: true } },
        },
      });
    });

    try {
      await notificationService.notifyDirected(record.id);
      await notificationService.notifyHandoffAwaiting(record.id);
    } catch {
      /* Notification failure must not undo dispatch. */
    }

    return record;
  },

  async close(id: string, user: CurrentUser, comment: string) {
    const current = await correspondenceRepository.findById(id);
    if (!current) throw new Error("Correspondence not found.");
    fail(assertCanClose(current.status));
    if (!canCloseCorrespondence(user, current.destinationOfficeId)) {
      throw new Error("You cannot close this letter.");
    }
    const openHandoff = await currentHandoff(id);
    if (openHandoff && !handoffAllowsForwardOrClose(openHandoff.state, true)) {
      throw new Error("Confirm the physical copy before closing this letter.");
    }
    const record = await this.applyStatus(id, "CLOSED", user.id, {
      type: "CLOSED",
      audit: "CHANGE_STATUS",
      note: comment,
    });
    try {
      await notificationService.notifyClosed(record.id);
    } catch {
      /* Notification failure must not undo closure. */
    }
    return record;
  },

  async acknowledgeHandoff(id: string, user: CurrentUser, comment: string) {
    const current = await correspondenceRepository.findById(id);
    if (!current) throw new Error("Correspondence not found.");
    const hasUnitStaff = await officeHasUnitStaff(
      current.destinationOfficeId ?? "",
    );
    if (
      !canAcknowledgeHandoff(
        user,
        current.destinationOfficeId,
        Boolean(current.destinationOfficeId) && hasUnitStaff,
      )
    ) {
      throw new Error(
        hasUnitStaff
          ? "Only the receiving unit can confirm this copy."
          : "Only Provost Office staff can confirm delivery when the destination has no unit login.",
      );
    }
    const handoff = await currentHandoff(id);
    if (!handoff || handoff.state !== "PENDING") {
      throw new Error("There is no physical copy waiting to be confirmed.");
    }

    await prisma.$transaction(async (tx) => {
      const changed = await tx.correspondenceHandoff.updateMany({
        where: { id: handoff.id, current: true, state: "PENDING" },
        data: {
          state: "RECEIVED",
          acknowledgedAt: new Date(),
          acknowledgedById: user.id,
          note: comment,
        },
      });
      if (changed.count !== 1) {
        throw new Error("This handoff changed while you were working. Refresh and try again.");
      }
      await recordEvent({
        tx,
        correspondenceId: id,
        actorId: user.id,
        type: "PHYSICAL_RECEIVED",
        fromStatus: current.status,
        toStatus: current.status,
        fromOfficeId: handoff.fromOfficeId,
        toOfficeId: handoff.toOfficeId,
        note: comment,
      });
      await recordAudit({
        userId: user.id,
        action: "CONFIRM_PHYSICAL_RECEIPT",
        module: "correspondence",
        details: id,
        tx,
      });
    });

    try {
      await notificationService.notifyPhysicalReceived(id);
    } catch {
      /* Notification failure must not undo acknowledgement. */
    }
  },

  async flagMissingPhysical(id: string, user: CurrentUser, comment: string) {
    const current = await correspondenceRepository.findById(id);
    if (!current) throw new Error("Correspondence not found.");
    const hasUnitStaff = await officeHasUnitStaff(
      current.destinationOfficeId ?? "",
    );
    if (
      !hasUnitStaff ||
      !canAcknowledgeHandoff(user, current.destinationOfficeId, true)
    ) {
      throw new Error("Only the receiving unit can flag this copy.");
    }
    const handoff = await currentHandoff(id);
    if (!handoff || handoff.state !== "PENDING") {
      throw new Error("There is no pending physical copy to flag.");
    }

    await prisma.$transaction(async (tx) => {
      const changed = await tx.correspondenceHandoff.updateMany({
        where: { id: handoff.id, current: true, state: "PENDING" },
        data: {
          state: "NOT_RECEIVED",
          acknowledgedAt: new Date(),
          acknowledgedById: user.id,
          note: comment,
        },
      });
      if (changed.count !== 1) {
        throw new Error("This handoff changed while you were working. Refresh and try again.");
      }
      await recordEvent({
        tx,
        correspondenceId: id,
        actorId: user.id,
        type: "PHYSICAL_NOT_RECEIVED",
        fromStatus: current.status,
        toStatus: current.status,
        fromOfficeId: handoff.fromOfficeId,
        toOfficeId: handoff.toOfficeId,
        note: comment,
      });
      await recordAudit({
        userId: user.id,
        action: "REPORT_PHYSICAL_NOT_RECEIVED",
        module: "correspondence",
        details: id,
        tx,
      });
    });

    try {
      await notificationService.notifyPhysicalNotReceived(id);
    } catch {
      /* Notification failure must not undo the flag. */
    }
  },

  async markPhysicalResent(id: string, user: CurrentUser, comment: string) {
    if (!canAccessAllCorrespondence(user)) {
      throw new Error("Only Provost Office staff can record a resend.");
    }
    const current = await correspondenceRepository.findById(id);
    if (!current) throw new Error("Correspondence not found.");
    const handoff = await currentHandoff(id);
    if (!handoff || handoff.state !== "NOT_RECEIVED") {
      throw new Error("This letter is not waiting for a resent physical copy.");
    }

    await prisma.$transaction(async (tx) => {
      const changed = await tx.correspondenceHandoff.updateMany({
        where: { id: handoff.id, current: true, state: "NOT_RECEIVED" },
        data: {
          state: "PENDING",
          resentAt: new Date(),
          resentById: user.id,
          acknowledgedAt: null,
          acknowledgedById: null,
          note: comment,
        },
      });
      if (changed.count !== 1) {
        throw new Error("This handoff changed while you were working. Refresh and try again.");
      }
      await recordEvent({
        tx,
        correspondenceId: id,
        actorId: user.id,
        type: "PHYSICAL_RESENT",
        fromStatus: current.status,
        toStatus: current.status,
        fromOfficeId: handoff.fromOfficeId,
        toOfficeId: handoff.toOfficeId,
        note: comment,
      });
      await recordAudit({
        userId: user.id,
        action: "MARK_PHYSICAL_RESENT",
        module: "correspondence",
        details: id,
        tx,
      });
    });

    try {
      await notificationService.notifyPhysicalResent(id);
    } catch {
      /* Notification failure must not undo the resend. */
    }
  },

  async reportOrphanPhysical(
    user: CurrentUser,
    input: {
      sendingOfficeId?: string | null;
      referenceHint?: string | null;
      applicantNameHint?: string | null;
      subjectHint?: string | null;
      datePhysicalReceived: Date;
      comment: string;
    },
  ) {
    if (!user.destinationOfficeId) {
      throw new Error("Your account is not assigned to a unit.");
    }

    const report = await prisma.physicalOrphanReport.create({
      data: {
        reportingOfficeId: user.destinationOfficeId,
        reportedById: user.id,
        sendingOfficeId: input.sendingOfficeId ?? null,
        referenceHint: input.referenceHint ?? null,
        applicantNameHint: input.applicantNameHint ?? null,
        subjectHint: input.subjectHint ?? null,
        datePhysicalReceived: input.datePhysicalReceived,
        note: input.comment,
      },
    });

    await recordAudit({
      userId: user.id,
      action: "REPORT_ORPHAN_PHYSICAL",
      module: "correspondence",
      details: report.id,
    });

    try {
      await notificationService.notifyVirtualRecordMissing(report.id);
    } catch {
      /* Notification failure must not undo the report. */
    }

    return report;
  },

  async resolveOrphanPhysical(
    user: CurrentUser,
    input: { id: string; correspondenceId?: string | null; comment: string },
  ) {
    if (!canResolveOrphanPhysical(user)) {
      throw new Error("Only Provost Office staff can resolve this report.");
    }
    const report = await prisma.physicalOrphanReport.findUnique({
      where: { id: input.id },
    });
    if (!report || report.status !== "OPEN") {
      throw new Error("This report is no longer open.");
    }

    const linkedId = input.correspondenceId?.trim() || null;
    if (linkedId) {
      const letter = await correspondenceRepository.findById(linkedId);
      if (!letter) throw new Error("That correspondence was not found.");
    }

    await prisma.physicalOrphanReport.update({
      where: { id: report.id },
      data: {
        status: linkedId ? "LINKED" : "RESOLVED",
        linkedCorrespondenceId: linkedId,
        linkedAt: new Date(),
        linkedById: user.id,
        note: `${report.note}\n\nResolution: ${input.comment}`,
      },
    });

    if (linkedId) {
      await recordEvent({
        correspondenceId: linkedId,
        actorId: user.id,
        type: "DISCREPANCY_RESOLVED",
        note: input.comment,
      });
    }

    await recordAudit({
      userId: user.id,
      action: "RESOLVE_ORPHAN_PHYSICAL",
      module: "correspondence",
      details: report.id,
    });

    try {
      await notificationService.notifyDiscrepancyResolved(report.id);
    } catch {
      /* Notification failure must not undo the resolution. */
    }
  },

  async correctStatus(
    id: string,
    status: CorrespondenceStatus,
    userId: string,
    reason: string,
  ) {
    const current = await correspondenceRepository.findById(id);
    if (!current) throw new Error("Correspondence not found.");
    fail(assertCanCorrect(current.status, status));
    if (!reason.trim()) {
      throw new Error("Give a reason for the correction.");
    }
    if (status === "DISPATCHED" && !current.destinationOfficeId) {
      throw new Error("DISPATCH_REQUIRED");
    }
    return this.applyStatus(id, status, userId, {
      type: "CORRECTED",
      audit: "CORRECT_STATUS",
      remarks: reason,
      note: reason,
    });
  },

  async updateStatus(
    id: string,
    status: CorrespondenceStatus,
    userId: string,
    remarks?: string | null,
  ) {
    const comment = remarks?.trim() || "Status update";
    if (status === "CLOSED") {
      throw new Error("Closing a letter requires a signed-in staff account.");
    }
    if (status === "KIV") return this.parkAsKiv(id, userId, comment);
    return this.correctStatus(id, status, userId, comment);
  },

  async applyStatus(
    id: string,
    status: CorrespondenceStatus,
    userId: string,
    options: {
      type: CorrespondenceEventType;
      audit: string;
      remarks?: string | null;
      note?: string | null;
    },
  ) {
    const current = await correspondenceRepository.findById(id);
    if (!current) throw new Error("Correspondence not found.");

    if (status === "DISPATCHED" && !current.destinationOfficeId) {
      throw new Error("DISPATCH_REQUIRED");
    }

    const patch: Prisma.CorrespondenceUpdateManyMutationInput = {
      status,
    };

    if (status === "KIV") {
      patch.statusBeforeKiv = current.status;
    } else {
      patch.statusBeforeKiv = null;
    }

    if (status === "DISPATCHED" && !current.dateSentToOffice) {
      patch.dateSentToOffice = new Date();
    }

    if (status === "CLOSED") {
      patch.dateClosed = current.dateClosed ?? new Date();
      patch.statusBeforeKiv = null;
    } else if (current.status === "CLOSED") {
      patch.dateClosed = null;
    }

    if (options.remarks !== undefined) {
      patch.remarks = options.remarks;
    }

    return prisma.$transaction(async (tx) => {
      const data: Prisma.CorrespondenceUpdateManyMutationInput = { ...patch };
      if (options.remarks !== undefined) data.remarks = options.remarks;

      const changed = await tx.correspondence.updateMany({
        where: { id, status: current.status },
        data,
      });
      if (changed.count !== 1) {
        throw new Error("This letter changed while you were working. Refresh and try again.");
      }

      if (status === "CLOSED") {
        await tx.correspondenceHandoff.updateMany({
          where: { correspondenceId: id, current: true, releasedAt: null },
          data: { current: false, releasedAt: new Date() },
        });
      }

      const record = await tx.correspondence.findUniqueOrThrow({
        where: { id },
        include: {
          destinationOffice: { select: { id: true, officeName: true } },
          createdBy: { select: { id: true, fullName: true } },
        },
      });

      await recordEvent({
        tx,
        correspondenceId: id,
        actorId: userId,
        type: options.type,
        fromStatus: current.status,
        toStatus: status,
        fromOfficeId: current.destinationOfficeId,
        toOfficeId: record.destinationOfficeId,
        note: options.note ?? options.remarks ?? null,
      });

      await recordAudit({
        userId,
        action: options.audit,
        module: "correspondence",
        details: `${id}:${current.status}->${status}`,
        tx,
      });

      return record;
    });
  },

  async updateRemarks(id: string, remarks: string | null, userId: string) {
    const record = await correspondenceRepository.update(id, { remarks });
    await recordAudit({
      userId,
      action: "UPDATE_REMARKS",
      module: "correspondence",
      details: id,
    });
    return record;
  },

  async delete(id: string, userId: string) {
    await correspondenceRepository.delete(id);
    const { removeCorrespondenceStorage } = await import("@/lib/attachments");
    await removeCorrespondenceStorage(id);
    await recordAudit({
      userId,
      action: "DELETE",
      module: "correspondence",
      details: id,
    });
  },

  statusLabel(status: CorrespondenceStatus) {
    return STATUS_META[status].label;
  },
};

async function resolveDestinationOfficeId(
  input: DispatchCorrespondenceInput,
): Promise<string> {
  const listedId = input.destinationOfficeId?.trim();
  if (listedId) return listedId;

  const customName = input.customDestination?.trim();
  if (!customName) {
    throw new Error("Choose a destination unit or type one outside the college.");
  }

  const existing = await prisma.destinationOffice.findFirst({
    where: { officeName: customName },
    select: { id: true },
  });
  if (existing) {
    await prisma.destinationOffice.update({
      where: { id: existing.id },
      data: { status: "ACTIVE" },
    });
    return existing.id;
  }

  const created = await prisma.destinationOffice.create({
    data: { officeName: customName, status: "ACTIVE" },
    select: { id: true },
  });
  return created.id;
}
