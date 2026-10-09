import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { DispatchForm } from "@/components/correspondence/dispatch-form";
import { StatusBadge } from "@/components/correspondence/status-badge";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { requireRegisterPage } from "@/lib/auth/guards";
import {
  canDispatchCorrespondence,
  canForwardCorrespondence,
} from "@/lib/auth/permissions";
import { getCorrespondenceDetail } from "@/server/queries/correspondence";
import { getActiveOffices } from "@/server/queries/dashboard";

export const metadata: Metadata = {
  title: "Dispatch correspondence",
  description: "Route a letter to a destination unit.",
};

export default async function DispatchCorrespondencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRegisterPage(`/correspondence/${id}/dispatch`);

  const [record, offices] = await Promise.all([
    getCorrespondenceDetail(id, user),
    getActiveOffices(),
  ]);

  if (!record) notFound();

  if (record.status === "CLOSED" || record.status === "KIV") {
    redirect(`/correspondence/${id}`);
  }

  const forwarding = record.status === "DISPATCHED";
  if (!forwarding && record.status !== "TREATED") {
    redirect(`/correspondence/${id}`);
  }
  if (forwarding && !canForwardCorrespondence(user, record.destinationOfficeId)) {
    redirect("/forbidden");
  }
  if (!forwarding && !canDispatchCorrespondence(user)) {
    redirect("/forbidden");
  }

  return (
    <>
      <PageHeader
        title={forwarding ? "Send to another unit" : "Dispatch / routing"}
        description={
          forwarding
            ? "Route this letter from its current unit to another unit and leave a comment."
            : "Choose the unit and leave a short comment. The letter then waits for the paper copy to be confirmed."
        }
        breadcrumbs={[
          { label: "Overview", href: "/dashboard" },
          { label: "Register", href: "/correspondence" },
          { label: record.referenceNumber, href: `/correspondence/${id}` },
          { label: forwarding ? "Forward" : "Dispatch" },
        ]}
        meta={
          <StatusBadge
            status={record.status}
            handoffState={record.handoffs?.[0]?.state}
          />
        }
      />
      <PageBody>
        <div className="mx-auto mb-4 max-w-xl space-y-1">
          <p className="font-mono text-sm font-semibold">
            {record.referenceNumber}
          </p>
          <p className="text-muted-foreground text-sm">{record.studentName}</p>
          <p className="text-sm">{record.subject}</p>
        </div>
        <DispatchForm
          correspondenceId={record.id}
          dateReceived={record.dateReceived}
          offices={offices}
          defaultDestinationOfficeId={
            forwarding ? undefined : record.destinationOfficeId
          }
          defaultDateLeaving={
            forwarding ? undefined : record.dateSentToOffice
          }
          mode={forwarding ? "forward" : "dispatch"}
        />
      </PageBody>
    </>
  );
}
