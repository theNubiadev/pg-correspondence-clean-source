import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { CorrespondenceForm } from "@/components/correspondence/correspondence-form";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { canEditCorrespondenceRecord } from "@/lib/auth/permissions";
import { requireEditPage } from "@/lib/auth/guards";
import { getCorrespondenceDetail } from "@/server/queries/correspondence";

export const metadata: Metadata = {
  title: "Edit correspondence",
};

export default async function EditCorrespondencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireEditPage(`/correspondence/${id}/edit`);
  const record = await getCorrespondenceDetail(id, user);
  if (!record) notFound();

  if (
    !canEditCorrespondenceRecord(user, {
      createdById: record.createdById,
      destinationOfficeId: record.destinationOfficeId,
      status: record.status,
    })
  ) {
    redirect("/forbidden");
  }

  return (
    <>
      <PageHeader
        title={`Edit ${record.referenceNumber}`}
        description="Update letter details. Routing is managed when the letter is dispatched."
        breadcrumbs={[
          { label: "Register", href: "/correspondence" },
          { label: record.referenceNumber, href: `/correspondence/${id}` },
          { label: "Edit" },
        ]}
      />
      <PageBody>
        <CorrespondenceForm
          mode="edit"
          defaults={{
            id: record.id,
            applicantType: record.applicantType,
            studentName: record.studentName,
            onBehalfOf: record.onBehalfOf,
            addresseeName: record.addresseeName,
            batchNumber: record.batchNumber,
            matricNumber: record.matricNumber,
            staffId: record.staffId,
            faculty: record.faculty,
            department: record.department,
            subject: record.subject,
            remarks: record.remarks,
            dateReceived: record.dateReceived,
            status: record.status,
          }}
        />
      </PageBody>
    </>
  );
}
