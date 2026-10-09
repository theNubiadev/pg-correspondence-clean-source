import type { Metadata } from "next";

import { PrelaunchForm } from "@/components/prelaunch/prelaunch-form";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { requireAdminPage } from "@/lib/auth/guards";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Pre-launch",
  description: "Record the briefing held before the register goes live.",
};

export default async function PrelaunchPage() {
  await requireAdminPage("/prelaunch");
  const events = await prisma.prelaunchEvent.findMany({
    orderBy: { heldAt: "desc" },
    include: { recordedBy: { select: { fullName: true } } },
  });

  return (
    <>
      <PageHeader
        title="Pre-launch"
        description="Log the briefing held with staff before the register goes live. Letters and scans stay on this computer."
        breadcrumbs={[
          { label: "Overview", href: "/dashboard" },
          { label: "Pre-launch" },
        ]}
      />
      <PageBody className="mx-auto max-w-3xl space-y-6">
        <PrelaunchForm />

        <section className="surface space-y-4 p-5 sm:p-6">
          <h2 className="text-sm font-semibold">Recorded events</h2>
          {events.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No pre-launch event has been recorded yet.
            </p>
          ) : (
            <ul className="space-y-4">
              {events.map((event) => (
                <li key={event.id} className="border-border border-b pb-4 last:border-0 last:pb-0">
                  <p className="text-sm font-medium">{event.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {formatDate(event.heldAt)}
                    {event.venue ? ` · ${event.venue}` : ""}
                    {` · recorded by ${event.recordedBy.fullName}`}
                  </p>
                  {event.notes ? (
                    <p className="mt-2 text-sm leading-relaxed">{event.notes}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </PageBody>
    </>
  );
}
