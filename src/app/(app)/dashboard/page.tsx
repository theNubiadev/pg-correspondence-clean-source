import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { RegisterSearch } from "@/components/dashboard/register-search";
import { QueueTable } from "@/components/dashboard/queue-table";
import {
  OfficeBreakdown,
  StatusBreakdown,
} from "@/components/dashboard/breakdown-list";
import { ActivityRail } from "@/components/dashboard/activity-rail";
import { ActionFlashToast } from "@/components/dashboard/action-flash-toast";
import { AdminOversightView } from "@/components/dashboard/admin-oversight";
import { requireRegisterPage } from "@/lib/auth/guards";
import {
  canCreateCorrespondence,
  dashboardOfficeId,
  isDepartmentStaff,
  isSuperAdmin,
} from "@/lib/auth/permissions";
import { ORG_SHORT_NAME } from "@/lib/constants";
import { formatNumber, formatTime } from "@/lib/format";
import {
  getActionQueue,
  getActiveOffices,
  getAdminOversight,
  getDashboardSummary,
  getDestinationOfficeBreakdown,
  getOpenOrphans,
  getRecentStatusUpdates,
  getStatusBreakdown,
  getUnitHandoffQueues,
} from "@/server/queries/dashboard";
import { OrphanReportForm } from "@/components/correspondence/orphan-report-form";
import { OrphanResolveForm } from "@/components/correspondence/orphan-resolve-form";
import { notificationService } from "@/server/services/notificationService";

export const metadata: Metadata = {
  title: "Overview",
  description: "What needs action now.",
};

export default async function DashboardPage() {
  const user = await requireRegisterPage("/dashboard");

  if (isSuperAdmin(user)) {
    const [summary, oversight] = await Promise.all([
      getDashboardSummary(),
      getAdminOversight(),
    ]);
    return (
      <>
        <Suspense fallback={null}>
          <ActionFlashToast />
        </Suspense>
        <AdminOversightView summary={summary} oversight={oversight} />
      </>
    );
  }

  const isDept = isDepartmentStaff(user);
  const officeId = dashboardOfficeId(user);
  const canCreate = canCreateCorrespondence(user);

  // Reminder sweeps must not block first paint (they can N+1 + SMTP).
  // Run in the background; failures are logged inside the service.
  if (isDept && officeId) {
    void notificationService
      .sweepUnattendedReminders(officeId)
      .catch((error) => console.error("[dashboard] unattended sweep failed", error));
    void notificationService
      .sweepHandoffReminders(officeId)
      .catch((error) => console.error("[dashboard] handoff sweep failed", error));
  }

  const [summary, statuses, byOffice, queue, activity, offices, unitHandoffs, orphans] =
    await Promise.all([
      getDashboardSummary(officeId),
      getStatusBreakdown(officeId),
      getDestinationOfficeBreakdown(officeId),
      getActionQueue(12, officeId),
      getRecentStatusUpdates(6, officeId),
      getActiveOffices(),
      isDept && officeId ? getUnitHandoffQueues(officeId) : Promise.resolve(null),
      isDept ? Promise.resolve([]) : getOpenOrphans(),
    ]);

  const scopeName = isDept
    ? (user.destinationOfficeName ?? "Your unit")
    : "Provost's Office";

  const viewCounts = {
    awaiting: summary.awaitingAction,
    "in-progress": summary.inProgress,
    kiv: summary.kiv,
    overdue: summary.overdue,
    today: summary.incomingToday,
    completed: summary.completed,
    closed: summary.closed,
    "physical-awaiting": summary.physicalAwaiting,
    "physical-discrepancy": summary.physicalNotReceived,
  };

  return (
    <>
      <Suspense fallback={null}>
        <ActionFlashToast />
      </Suspense>
      <PageHeader
        dense
        eyebrow={isDept ? ORG_SHORT_NAME : "Registry counter"}
        title={scopeName}
        description={
          isDept
            ? "Letters assigned to your unit."
            : "What needs action now?"
        }
        meta={
          <>
            <MetaFigure
              value={summary.open}
              label="open"
              token="--status-assigned"
            />
            <MetaFigure
              value={summary.overdue}
              label="overdue"
              token="--destructive"
              muted={summary.overdue === 0}
            />
            <span className="hidden sm:inline">
              Updated {formatTime(new Date())}
            </span>
          </>
        }
        actions={
          canCreate ? (
            <Button asChild size="sm">
              <Link href="/correspondence/new">Log correspondence</Link>
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link href="/correspondence">Open full register</Link>
            </Button>
          )
        }
      />

      <PageBody className="space-y-6">
        <section aria-label="What needs action now">
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Needs Provost attention"
              value={summary.awaitingAction}
              delta={
                summary.incomingToday > 0
                  ? `${summary.incomingToday} received today`
                  : "none received today"
              }
              icon="Inbox"
              tone="warning"
              emphasis={summary.awaitingAction > 0}
              href="/correspondence?view=awaiting"
            />
            <StatCard
              label="Keep in view"
              value={summary.kiv}
              delta="Set aside; not closed"
              icon="Eye"
              tone="neutral"
              emphasis={summary.kiv > 0}
              href="/correspondence?view=kiv"
            />
            <StatCard
              label="Overdue"
              value={summary.overdue}
              delta={`open past ${summary.overdueAfterDays} days`}
              icon="TriangleAlert"
              tone="danger"
              emphasis={summary.overdue > 0}
              href="/correspondence?view=overdue"
            />
            <StatCard
              label="Received today"
              value={summary.incomingToday}
              delta="logged since midnight"
              icon="FilePlus2"
              tone="neutral"
              href="/correspondence?view=today"
            />
            <StatCard
              label="Waiting for physical copy"
              value={summary.physicalAwaiting}
              delta="sent to unit; paper not yet confirmed"
              icon="Clock"
              tone="warning"
              emphasis={summary.physicalAwaiting > 0}
              href="/correspondence?view=physical-awaiting"
            />
          </div>
        </section>

        <SectionCard
          title="Latest updates"
          description="Most recent movement on the register."
        >
          <ActivityRail items={activity} />
        </SectionCard>

        {!isDept && summary.physicalAwaiting > 0 ? (
          <SectionCard
            title="Waiting for physical copy"
            description="These letters are with a unit on screen, but the paper copy is not confirmed yet."
            action={{
              label: "Open waiting for physical copy",
              href: "/correspondence?view=physical-awaiting",
            }}
          >
            <p className="text-sm">
              <span className="font-semibold tabular-nums">
                {formatNumber(summary.physicalAwaiting)}
              </span>{" "}
              letter{summary.physicalAwaiting === 1 ? "" : "s"} still waiting for
              the paper copy to be confirmed.
            </p>
          </SectionCard>
        ) : null}

        {isDept && unitHandoffs && unitHandoffs.notReceived.length > 0 ? (
          <SectionCard
            title="Paper not received"
            description="These letters are on screen, but the paper copy has not arrived."
            bodyClassName="p-0"
            action={{
              label: "Open list",
              href: "/correspondence?view=physical-discrepancy",
            }}
          >
            <QueueTable
              rows={unitHandoffs.notReceived.slice(0, 5)}
              showDestination={false}
              newestFirst
              overdueAfterDays={summary.overdueAfterDays}
            />
          </SectionCard>
        ) : null}

        {isDept && unitHandoffs && unitHandoffs.awaitingAck.length > 0 ? (
          <SectionCard
            title="Confirm the paper copy"
            description="On your unit's screen. Confirm the paper before you forward or close."
            bodyClassName="p-0"
            action={{
              label: "Open list",
              href: "/correspondence?view=physical-awaiting",
            }}
          >
            <QueueTable
              rows={unitHandoffs.awaitingAck.slice(0, 5)}
              showDestination={false}
              newestFirst
              overdueAfterDays={summary.overdueAfterDays}
            />
          </SectionCard>
        ) : null}

        <SectionCard
          title={isDept ? "Letters in your unit" : "Action queue"}
          description={
            isDept
              ? "Newest first. Confirm paper on a letter before forwarding it."
              : "Open letters, longest waiting first."
          }
          action={{ label: "Full register", href: "/correspondence" }}
          bodyClassName="p-0"
        >
          <QueueTable
            rows={queue.slice(0, 8)}
            showDestination={!isDept}
            newestFirst={isDept}
            overdueAfterDays={summary.overdueAfterDays}
            emptyLabel="No open letters in this queue."
          />
        </SectionCard>

        {isDept ? (
          <details className="surface px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium">
              Paper arrived, but it is not on the register
            </summary>
            <p className="text-muted-foreground mt-1 mb-3 text-xs">
              Use this only when the physical letter has no matching entry.
            </p>
            <OrphanReportForm offices={offices} />
          </details>
        ) : orphans.length > 0 ? (
          <SectionCard
            title="Physical copies without a register entry"
            description="Unit reports that still need Provost action."
          >
            <ul className="space-y-2 text-sm">
              {orphans.map((report) => (
                <li key={report.id} className="border-border rounded-md border px-3 py-2">
                  <p className="font-medium">
                    {report.referenceHint || report.applicantNameHint || "Unidentified letter"}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Reported by {report.reportingOffice.officeName}
                    {report.sendingOffice
                      ? ` Â· from ${report.sendingOffice.officeName}`
                      : ""}
                  </p>
                  <OrphanResolveForm id={report.id} />
                </li>
              ))}
            </ul>
          </SectionCard>
        ) : null}

        <RegisterSearch
          counts={viewCounts}
          total={summary.total}
          heading="Search this queue"
          placeholder={
            isDept
              ? "Search this queue by reference, name, ID or subjectâ€¦"
              : "Search this queue by reference, name, ID or subjectâ€¦"
          }
        />

        <div className="grid items-start gap-4 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <SectionCard
              title="By status"
              description={
                isDept
                  ? "Stage of every letter assigned to your unit."
                  : "Stage of every letter on the register."
              }
            >
              <StatusBreakdown data={statuses} />
            </SectionCard>
          </div>

          <div className="space-y-4">
            {isDept ? null : (
              <SectionCard
                title="By destination unit"
                description="Where letters are being routed."
                action={{ label: "Reports", href: "/reports" }}
              >
                <OfficeBreakdown data={byOffice} />
              </SectionCard>
            )}
          </div>
        </div>
      </PageBody>
    </>
  );
}

function MetaFigure({
  value,
  label,
  token,
  muted = false,
}: {
  value: number;
  label: string;
  token: string;
  muted?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className="size-1.5 rounded-full"
        style={{
          backgroundColor: muted ? "var(--muted-foreground)" : `var(${token})`,
          opacity: muted ? 0.45 : 1,
        }}
      />
      <span className="text-foreground tabular font-semibold">
        {formatNumber(value)}
      </span>
      {label}
    </span>
  );
}
