import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CorrespondenceDetailView } from "@/components/correspondence/detail-view";
import { requireRegisterPage } from "@/lib/auth/guards";
import {
  allowedActionsFor,
  canEditCorrespondenceRecord,
  canSetFinancePvOnLetter,
} from "@/lib/auth/permissions";
import { progressForViewer } from "@/lib/workflow/view-model";
import {
  getCorrespondenceDetail,
  getCorrespondenceEvents,
} from "@/server/queries/correspondence";
import { destinationHasUnitStaff } from "@/server/services/correspondenceService";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const user = await requireRegisterPage();
  const { id } = await params;
  const record = await getCorrespondenceDetail(id, user);
  if (!record) return { title: "Correspondence not found" };
  return {
    title: record.referenceNumber,
    description: record.subject,
  };
}

export default async function CorrespondenceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireRegisterPage();
  const { id } = await params;
  const query = await searchParams;
  const record = await getCorrespondenceDetail(id, user);
  if (!record) notFound();

  const events = await getCorrespondenceEvents(record.id);
  const handoff = record.handoffs?.[0] ?? null;
  const hasUnitStaff = await destinationHasUnitStaff(record.destinationOfficeId);
  const progress = progressForViewer({
    user,
    status: record.status,
    statusBeforeKiv: record.statusBeforeKiv,
    destinationName: record.destinationOffice?.officeName,
    destinationOfficeId: record.destinationOfficeId,
    handoff: handoff
      ? {
          id: handoff.id,
          state: handoff.state,
          toOfficeId: handoff.toOfficeId,
          toOfficeName: handoff.toOffice?.officeName ?? null,
          fromOfficeName: handoff.fromOffice?.officeName ?? null,
          virtualSentAt: handoff.virtualSentAt,
          acknowledgedAt: handoff.acknowledgedAt,
          note: handoff.note,
        }
      : null,
  });
  const view = typeof query.from === "string" ? query.from : undefined;
  const returnTo =
    view && view.startsWith("/correspondence")
      ? view
      : typeof query.view === "string"
        ? `/correspondence?view=${query.view}`
        : "/correspondence";

  return (
    <CorrespondenceDetailView
      record={record}
      events={events}
      canEdit={canEditCorrespondenceRecord(user, {
        createdById: record.createdById,
        destinationOfficeId: record.destinationOfficeId,
        status: record.status,
      })}
      canManageFinancePv={canSetFinancePvOnLetter(
        user,
        record.destinationOfficeId,
      )}
      actions={allowedActionsFor(
        user,
        record.status,
        record.destinationOfficeId,
        handoff?.state,
        {
          acknowledgementRequired: Boolean(handoff),
          destinationHasUnitStaff: hasUnitStaff,
          createdById: record.createdById,
        },
      )}
      progress={progress}
      handoff={handoff}
      returnTo={returnTo}
      acknowledgeAsProvostFallback={
        Boolean(handoff?.state === "PENDING") &&
        !hasUnitStaff &&
        (user.role === "SUPER_ADMIN" || user.role === "PROVOST_STAFF")
      }
    />
  );
}
