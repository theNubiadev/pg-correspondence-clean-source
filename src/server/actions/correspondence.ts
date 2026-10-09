"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { CorrespondenceStatus } from "@prisma/client";

import {
  requireCreateAccess,
  requireEditAccess,
  requireRegisterAccess,
  requireSystemAdmin,
} from "@/lib/auth/guards";
import {
  canAdvanceCorrespondence,
  canCloseCorrespondence,
  canCorrectStatus,
  canDispatchCorrespondence,
  canEditCorrespondenceRecord,
  canForwardCorrespondence,
  canParkKiv,
  canReportOrphanPhysical,
  canSetFinancePvOnLetter,
} from "@/lib/auth/permissions";
import {
  acknowledgeHandoffSchema,
  closeCorrespondenceSchema,
  commentedIdSchema,
  correctStatusSchema,
  createCorrespondenceSchema,
  dispatchCorrespondenceSchema,
  flagMissingPhysicalSchema,
  markPhysicalResentSchema,
  orphanPhysicalSchema,
  resolveOrphanSchema,
  setFinancePvSchema,
  updateCorrespondenceSchema,
} from "@/lib/validations/correspondence";
import { correspondenceService } from "@/server/services/correspondenceService";
import {
  actionError,
  actionErrorFromZod,
  actionSuccess,
  formToObject,
  rethrowNextNavigation,
  toActionError,
  type ActionState,
} from "@/server/actions/types";

export async function createCorrespondenceAction(
  _prev: ActionState<{ id: string }>,
  formData: FormData,
): Promise<ActionState<{ id: string; referenceNumber: string }>> {
  let createdId: string | null = null;

  try {
    const user = await requireCreateAccess();
    const parsed = createCorrespondenceSchema.safeParse(formToObject(formData));
    if (!parsed.success) return actionErrorFromZod(parsed.error);

    const { assertValidAttachmentFiles, filesFromFormData } = await import(
      "@/lib/attachments"
    );
    const files = filesFromFormData(formData);
    await assertValidAttachmentFiles(files);

    const record = await correspondenceService.create({
      studentName: parsed.data.studentName,
      matricNumber: parsed.data.matricNumber ?? "",
      faculty: parsed.data.faculty ?? "",
      department: parsed.data.department ?? "",
      staffId: parsed.data.staffId ?? null,
      applicantType: parsed.data.applicantType,
      onBehalfOf: parsed.data.onBehalfOf ?? null,
      addresseeName: parsed.data.addresseeName ?? null,
      batchNumber: parsed.data.batchNumber ?? null,
      subject: parsed.data.subject,
      remarks: parsed.data.remarks ?? null,
      dateReceived: parsed.data.dateReceived,
      status: parsed.data.status as CorrespondenceStatus,
      createdById: user.id,
    });

    createdId = record.id;
    try {
      await correspondenceService.addAttachments(record.id, user.id, files);
    } catch (attachError) {
      await correspondenceService.delete(record.id, user.id);
      createdId = null;
      throw attachError;
    }

    revalidatePath("/correspondence");
    revalidatePath("/dashboard");

    redirect(`/dashboard?logged=${encodeURIComponent(record.referenceNumber)}`);
  } catch (error) {
    rethrowNextNavigation(error);
    if (createdId) {
      return actionSuccess("Correspondence logged.", {
        id: createdId,
        referenceNumber: "",
      });
    }
    return toActionError(error);
  }
}

export async function updateCorrespondenceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireEditAccess();
    const parsed = updateCorrespondenceSchema.safeParse(formToObject(formData));
    if (!parsed.success) return actionErrorFromZod(parsed.error);

    const existing = await correspondenceService.getById(parsed.data.id);
    if (!existing) return actionError("Correspondence not found.");
    if (
      !canEditCorrespondenceRecord(user, {
        createdById: existing.createdById,
        destinationOfficeId: existing.destinationOfficeId,
        status: existing.status,
      })
    ) {
      return actionError("You can only edit letters you logged or that are assigned to your unit.");
    }

    const { assertValidAttachmentFiles, filesFromFormData } = await import(
      "@/lib/attachments"
    );
    const files = filesFromFormData(formData);
    await assertValidAttachmentFiles(files);

    const { id, ...data } = parsed.data;
    await correspondenceService.update(
      id,
      {
        studentName: data.studentName,
        matricNumber: data.matricNumber ?? "",
        faculty: data.faculty ?? "",
        department: data.department ?? "",
        staffId: data.staffId ?? null,
        applicantType: data.applicantType,
        onBehalfOf: data.onBehalfOf ?? null,
        addresseeName: data.addresseeName ?? null,
        batchNumber: data.batchNumber ?? null,
        subject: data.subject,
        remarks: data.remarks ?? null,
        comment: data.comment ?? "",
        dateReceived: data.dateReceived,
        dateSentToOffice: data.dateSentToOffice,
        destinationOfficeId: data.destinationOfficeId ?? null,
      },
      user.id,
    );
    await correspondenceService.addAttachments(id, user.id, files);

    revalidatePath("/correspondence");
    revalidatePath(`/correspondence/${id}`);
    revalidatePath("/dashboard");
    return actionSuccess("Correspondence updated.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function setFinancePvAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireRegisterAccess();
    const parsed = setFinancePvSchema.safeParse(formToObject(formData));
    if (!parsed.success) return actionErrorFromZod(parsed.error);

    const existing = await correspondenceService.getById(parsed.data.id);
    if (!existing) return actionError("Correspondence not found.");
    if (!canSetFinancePvOnLetter(user, existing.destinationOfficeId)) {
      return actionError(
        "Finance PV numbers can only be set on letters assigned to Finance.",
      );
    }

    await correspondenceService.setFinancePvNumber(
      parsed.data.id,
      parsed.data.pvNumber,
      user.id,
    );
    revalidatePath("/correspondence");
    revalidatePath(`/correspondence/${parsed.data.id}`);
    revalidatePath("/dashboard");
    return actionSuccess(
      parsed.data.pvNumber?.trim()
        ? "Finance PV number saved."
        : "Finance PV number cleared.",
    );
  } catch (error) {
    return toActionError(error);
  }
}

export async function advanceStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireRegisterAccess();
    if (!canAdvanceCorrespondence(user)) {
      return actionError("Only Provost Office staff can advance a letter.");
    }
    const parsed = commentedIdSchema.safeParse(formToObject(formData));
    if (!parsed.success) return actionErrorFromZod(parsed.error);

    const existing = await correspondenceService.getById(parsed.data.id);
    if (!existing) return actionError("Correspondence not found.");

    try {
      await correspondenceService.advanceStatus(
        parsed.data.id,
        user.id,
        parsed.data.comment,
      );
    } catch (error) {
      if (error instanceof Error && error.message === "DISPATCH_REQUIRED") {
        redirect(`/correspondence/${parsed.data.id}/dispatch`);
      }
      throw error;
    }

    revalidatePath("/correspondence");
    revalidatePath(`/correspondence/${parsed.data.id}`);
    revalidatePath("/dashboard");
    redirect("/dashboard");
  } catch (error) {
    return toActionError(error);
  }
}

export async function dispatchCorrespondenceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let dispatchedId: string | null = null;

  try {
    const user = await requireRegisterAccess();
    const parsed = dispatchCorrespondenceSchema.safeParse(formToObject(formData));
    if (!parsed.success) return actionErrorFromZod(parsed.error);

    const existing = await correspondenceService.getById(parsed.data.id);
    if (!existing) return actionError("Correspondence not found.");

    const forwarding = existing.status === "DISPATCHED";
    if (forwarding && !canForwardCorrespondence(user, existing.destinationOfficeId)) {
      return actionError("You cannot send this letter to another unit.");
    }
    if (!forwarding && !canDispatchCorrespondence(user)) {
      return actionError("Only Provost Office staff can dispatch a letter.");
    }

    const { assertValidAttachmentFiles, filesFromFormData } = await import(
      "@/lib/attachments"
    );
    const files = filesFromFormData(formData);
    await assertValidAttachmentFiles(files);

    await correspondenceService.dispatch(
      parsed.data.id,
      {
        destinationOfficeId: parsed.data.destinationOfficeId || undefined,
        customDestination: parsed.data.customDestination || undefined,
        dateSentToOffice: parsed.data.dateSentToOffice,
        comment: parsed.data.comment,
      },
      user,
    );

    dispatchedId = parsed.data.id;
    try {
      await correspondenceService.addAttachments(parsed.data.id, user.id, files);
    } catch (attachError) {
      revalidatePath("/correspondence");
      revalidatePath(`/correspondence/${parsed.data.id}`);
      revalidatePath("/dashboard");
      return actionError(
        attachError instanceof Error
          ? `Letter was sent, but the scan was not saved: ${attachError.message}`
          : "Letter was sent, but the scan was not saved. Open the letter and attach it again.",
      );
    }
    revalidatePath("/correspondence");
    revalidatePath(`/correspondence/${parsed.data.id}`);
    revalidatePath("/dashboard");
    redirect("/dashboard?dispatched=1");
  } catch (error) {
    rethrowNextNavigation(error);
    if (dispatchedId) {
      return actionSuccess("Correspondence dispatched.");
    }
    return toActionError(error);
  }
}

export async function closeCorrespondenceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireRegisterAccess();
    const parsed = closeCorrespondenceSchema.safeParse(formToObject(formData));
    if (!parsed.success) return actionErrorFromZod(parsed.error);

    const existing = await correspondenceService.getById(parsed.data.id);
    if (!existing) return actionError("Correspondence not found.");

    if (!canCloseCorrespondence(user, existing.destinationOfficeId)) {
      return actionError("You cannot close this letter.");
    }

    await correspondenceService.close(parsed.data.id, user, parsed.data.comment);

    revalidatePath("/correspondence");
    revalidatePath(`/correspondence/${parsed.data.id}`);
    revalidatePath("/dashboard");
    redirect("/dashboard?closed=1");
  } catch (error) {
    return toActionError(error);
  }
}

export async function correctStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireSystemAdmin();
    const parsed = correctStatusSchema.safeParse(formToObject(formData));
    if (!parsed.success) return actionErrorFromZod(parsed.error);
    if (!canCorrectStatus(user)) {
      return actionError("Only a Super Administrator can correct status.");
    }

    try {
      await correspondenceService.correctStatus(
        parsed.data.id,
        parsed.data.status as CorrespondenceStatus,
        user.id,
        parsed.data.reason,
      );
    } catch (error) {
      if (error instanceof Error && error.message === "DISPATCH_REQUIRED") {
        redirect(`/correspondence/${parsed.data.id}/dispatch`);
      }
      throw error;
    }

    revalidatePath("/correspondence");
    revalidatePath(`/correspondence/${parsed.data.id}`);
    revalidatePath("/dashboard");
    return actionSuccess("Status corrected.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function parkAsKivAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireRegisterAccess();
    if (!canParkKiv(user)) {
      return actionError("Only Provost Office staff can keep a letter in view.");
    }
    const parsed = commentedIdSchema.safeParse(formToObject(formData));
    if (!parsed.success) return actionErrorFromZod(parsed.error);

    const existing = await correspondenceService.getById(parsed.data.id);
    if (!existing) return actionError("Correspondence not found.");

    await correspondenceService.parkAsKiv(
      parsed.data.id,
      user.id,
      parsed.data.comment,
    );

    revalidatePath("/correspondence");
    revalidatePath(`/correspondence/${parsed.data.id}`);
    revalidatePath("/dashboard");
    return actionSuccess("Moved to Keep in view.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function resumeFromKivAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireRegisterAccess();
    if (!canParkKiv(user)) {
      return actionError("Only Provost Office staff can resume a letter.");
    }
    const parsed = commentedIdSchema.safeParse(formToObject(formData));
    if (!parsed.success) return actionErrorFromZod(parsed.error);

    const existing = await correspondenceService.getById(parsed.data.id);
    if (!existing) return actionError("Correspondence not found.");

    await correspondenceService.resumeFromKiv(
      parsed.data.id,
      user.id,
      parsed.data.comment,
    );

    revalidatePath("/correspondence");
    revalidatePath(`/correspondence/${parsed.data.id}`);
    revalidatePath("/dashboard");
    return actionSuccess("Resumed from Keep in view.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function acknowledgeHandoffAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireRegisterAccess();
    const parsed = acknowledgeHandoffSchema.safeParse(formToObject(formData));
    if (!parsed.success) return actionErrorFromZod(parsed.error);
    await correspondenceService.acknowledgeHandoff(
      parsed.data.id,
      user,
      parsed.data.comment,
    );
    revalidatePath("/correspondence");
    revalidatePath(`/correspondence/${parsed.data.id}`);
    revalidatePath("/dashboard");
    return actionSuccess("Physical copy confirmed.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function flagMissingPhysicalAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireRegisterAccess();
    const parsed = flagMissingPhysicalSchema.safeParse(formToObject(formData));
    if (!parsed.success) return actionErrorFromZod(parsed.error);
    await correspondenceService.flagMissingPhysical(
      parsed.data.id,
      user,
      parsed.data.comment,
    );
    revalidatePath("/correspondence");
    revalidatePath(`/correspondence/${parsed.data.id}`);
    revalidatePath("/dashboard");
    return actionSuccess("Physical copy flagged as not received.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function markPhysicalResentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireRegisterAccess();
    const parsed = markPhysicalResentSchema.safeParse(formToObject(formData));
    if (!parsed.success) return actionErrorFromZod(parsed.error);
    await correspondenceService.markPhysicalResent(
      parsed.data.id,
      user,
      parsed.data.comment,
    );
    revalidatePath("/correspondence");
    revalidatePath(`/correspondence/${parsed.data.id}`);
    revalidatePath("/dashboard");
    return actionSuccess("Physical copy marked as resent.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function reportOrphanPhysicalAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireRegisterAccess();
    if (!canReportOrphanPhysical(user)) {
      return actionError("Only unit staff can report a missing register entry.");
    }
    const parsed = orphanPhysicalSchema.safeParse(formToObject(formData));
    if (!parsed.success) return actionErrorFromZod(parsed.error);
    await correspondenceService.reportOrphanPhysical(user, {
      sendingOfficeId: parsed.data.sendingOfficeId,
      referenceHint: parsed.data.referenceHint,
      applicantNameHint: parsed.data.applicantNameHint,
      subjectHint: parsed.data.subjectHint,
      datePhysicalReceived: parsed.data.datePhysicalReceived,
      comment: parsed.data.comment,
    });
    revalidatePath("/dashboard");
    revalidatePath("/correspondence");
    return actionSuccess("The missing-register report has been sent.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function resolveOrphanPhysicalAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireRegisterAccess();
    const parsed = resolveOrphanSchema.safeParse(formToObject(formData));
    if (!parsed.success) return actionErrorFromZod(parsed.error);
    await correspondenceService.resolveOrphanPhysical(user, {
      id: parsed.data.id,
      correspondenceId: parsed.data.correspondenceId,
      comment: parsed.data.comment,
    });
    revalidatePath("/dashboard");
    revalidatePath("/correspondence");
    return actionSuccess("The missing-register report has been resolved.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteCorrespondenceAction(id: string): Promise<ActionState> {
  try {
    const user = await requireSystemAdmin();
    await correspondenceService.delete(id, user.id);
    revalidatePath("/correspondence");
    revalidatePath("/dashboard");
    return actionSuccess("Correspondence deleted.");
  } catch (error) {
    return toActionError(error);
  }
}
