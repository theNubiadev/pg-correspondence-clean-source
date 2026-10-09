"use client";

import Link from "next/link";
import { TriangleAlert, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { formatNumber, formatRelative, humanizeEnum } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  AdminOversight,
  DashboardSummary,
} from "@/lib/admin-oversight-types";

export function AdminOversightView({
  summary,
  oversight,
}: {
  summary: DashboardSummary;
  oversight: AdminOversight;
}) {
  const { staff, offices, recentLogins, recentAudit } = oversight;
  const activeOffices = offices.filter((o) => o.active).length;
  const unitsWithOverdue = offices.filter((o) => o.overdue > 0).length;
  const overduePercent =
    summary.open === 0
      ? 0
      : Math.round((summary.overdue / summary.open) * 100);

  return (
    <>
      <PageHeader
        dense
        eyebrow="System administration"
        title="College oversight"
        description="System health and exceptions across the correspondence register."
        meta={
          <span className="hidden sm:inline">
            {formatNumber(activeOffices)} active units
            {unitsWithOverdue > 0
              ? ` · ${formatNumber(unitsWithOverdue)} carrying overdue work`
              : ""}
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/settings">Units</Link>
            </Button>
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/staff">
                <Users className="size-4" />
                Users
              </Link>
            </Button>
          </div>
        }
      />

      <PageBody className="space-y-6">
        <section aria-label="System health">
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Active staff"
              value={staff.active}
              delta={`${formatNumber(staff.provost)} Provost Office · ${formatNumber(staff.unitStaff)} in units`}
              icon="Users"
              tone="primary"
              href="/staff"
            />
            <StatCard
              label="Open letters"
              value={summary.open}
              delta={`${formatNumber(summary.incomingToday)} received today`}
              icon="Inbox"
              tone="warning"
              emphasis={summary.open > 0}
              href="/correspondence"
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
              label="Overdue share"
              value={`${overduePercent}%`}
              delta={`${formatNumber(summary.overdue)} of ${formatNumber(summary.open)} open`}
              icon="Building2"
              tone={overduePercent > 0 ? "danger" : "neutral"}
              href="/correspondence?view=overdue"
            />
          </div>
        </section>

        <section aria-label="Units across the college">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-[0.9375rem] font-semibold tracking-[-0.01em]">
                Units across the college
              </h2>
              <p className="text-muted-foreground mt-0.5 text-[0.75rem]">
                Open work and overdue letters in every destination office.
              </p>
            </div>
            <Link
              href="/settings"
              className="text-primary hidden text-xs font-medium hover:underline sm:inline"
            >
              Manage units
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {offices.map((office) => {
              const share =
                office.open === 0
                  ? office.overdue > 0
                    ? 100
                    : 0
                  : Math.round((office.overdue / office.open) * 100);

              return (
                <Link
                  key={office.id}
                  href={`/correspondence?destinationOfficeId=${office.id}`}
                  className={cn(
                    "surface-flat block px-4 py-3.5 focus-visible:ring-[3px] focus-visible:ring-ring/45 focus-visible:outline-none",
                    !office.active && "opacity-60",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[0.875rem] font-semibold tracking-[-0.01em]">
                        {office.name}
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-[0.6875rem]">
                        {office.active ? "Active unit" : "Inactive"}
                        {" · "}
                        {formatNumber(office.staff)} staff
                      </p>
                    </div>
                    {office.overdue > 0 ? (
                      <span className="bg-destructive/12 text-destructive inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold">
                        <TriangleAlert className="size-3" />
                        {formatNumber(office.overdue)}
                      </span>
                    ) : null}
                  </div>

                  <dl className="mt-3 grid grid-cols-3 gap-2 text-[0.75rem]">
                    <div>
                      <dt className="text-muted-foreground">Open</dt>
                      <dd className="tabular font-semibold">
                        {formatNumber(office.open)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Overdue</dt>
                      <dd className="tabular font-semibold">
                        {formatNumber(office.overdue)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Overdue %</dt>
                      <dd className="tabular font-semibold">{share}%</dd>
                    </div>
                  </dl>
                </Link>
              );
            })}
          </div>
        </section>

        <div className="grid items-start gap-4 xl:grid-cols-2">
          <section className="surface-flat">
            <header className="flex items-start justify-between gap-4 border-b px-4 py-2.5">
              <div>
                <h2 className="text-[0.9375rem] font-semibold tracking-[-0.01em]">
                  Recent sign-ins
                </h2>
                <p className="text-muted-foreground mt-0.5 text-[0.75rem]">
                  Who has used the register lately.
                </p>
              </div>
              <Link
                href="/staff"
                className="text-primary text-xs font-medium hover:underline"
              >
                All users
              </Link>
            </header>
            <ul className="divide-y">
              {recentLogins.length === 0 ? (
                <li className="text-muted-foreground px-4 py-8 text-center text-xs">
                  No sign-ins recorded yet.
                </li>
              ) : (
                recentLogins.map((user) => (
                  <li
                    key={user.id}
                    className="flex items-center justify-between gap-3 px-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[0.8125rem] font-medium">
                        {user.fullName}
                      </p>
                      <p className="text-muted-foreground truncate font-mono text-[0.6875rem]">
                        {user.username}
                        {user.officeName ? ` · ${user.officeName}` : ""}
                      </p>
                    </div>
                    <span className="text-muted-foreground shrink-0 text-[0.6875rem]">
                      {formatRelative(user.lastLoginAt)}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="surface-flat">
            <header className="flex items-start justify-between gap-4 border-b px-4 py-2.5">
              <div>
                <h2 className="text-[0.9375rem] font-semibold tracking-[-0.01em]">
                  System activity
                </h2>
                <p className="text-muted-foreground mt-0.5 text-[0.75rem]">
                  Latest audited actions across the college.
                </p>
              </div>
              <Link
                href="/audit-trail"
                className="text-primary text-xs font-medium hover:underline"
              >
                Audit logs
              </Link>
            </header>
            <ul className="divide-y">
              {recentAudit.length === 0 ? (
                <li className="text-muted-foreground px-4 py-8 text-center text-xs">
                  No audit entries yet.
                </li>
              ) : (
                recentAudit.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between gap-3 px-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[0.8125rem] font-medium">
                        {humanizeEnum(entry.action)}
                      </p>
                      <p className="text-muted-foreground truncate text-[0.6875rem]">
                        {entry.userName ?? "System"}
                        {" · "}
                        {entry.module}
                      </p>
                    </div>
                    <span className="text-muted-foreground shrink-0 text-[0.6875rem]">
                      {formatRelative(entry.createdAt)}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      </PageBody>
    </>
  );
}
