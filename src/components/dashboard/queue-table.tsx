"use client";

import Link from "next/link";
import type { CorrespondenceStatus, PhysicalReceiptState } from "@prisma/client";

import { StatusBadge } from "@/components/correspondence/status-badge";
import { cn } from "@/lib/utils";
import { describeAge, formatDate } from "@/lib/format";

export type QueueRow = {
  id: string;
  referenceNumber: string;
  studentName: string;
  matricNumber: string;
  staffId: string | null;
  department: string;
  subject: string;
  status: CorrespondenceStatus;
  statusBeforeKiv?: CorrespondenceStatus | null;
  dateReceived: Date;
  destinationOffice: { id: string; officeName: string } | null;
  handoffs?: Array<{ state: PhysicalReceiptState }> | null;
};

const AGE_TONES = {
  neutral: "text-muted-foreground",
  warning: "text-warning",
  danger: "text-destructive font-semibold",
} as const;

/**
 * The working queue: Provost-wide oldest first, unit dashboards newest assigned first.
 */
export function QueueTable({
  rows,
  showDestination = true,
  newestFirst = false,
  overdueAfterDays,
  emptyLabel = "Nothing in this queue.",
}: {
  rows: QueueRow[];
  showDestination?: boolean;
  newestFirst?: boolean;
  overdueAfterDays: number;
  emptyLabel?: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground px-4 py-3 text-sm">{emptyLabel}</p>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">
            {newestFirst
              ? "Open correspondence, newest assigned first"
              : "Open correspondence, longest waiting first"}
          </caption>
          <thead>
            <tr className="bg-muted/40 text-muted-foreground border-b [&>th]:px-3 [&>th]:py-2 [&>th]:text-[0.6875rem] [&>th]:font-semibold [&>th]:tracking-[0.05em] [&>th]:uppercase">
              <th scope="col">Reference</th>
              <th scope="col">Applicant</th>
              {showDestination ? (
                <th scope="col">Destination</th>
              ) : null}
              <th scope="col">Status</th>
              <th scope="col" className="text-right">
                Age
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const age = describeAge(row.dateReceived, overdueAfterDays);
              const handoffState = row.handoffs?.[0]?.state ?? null;

              return (
                <tr
                  key={row.id}
                  className="hover:bg-accent/30 border-b transition-colors last:border-0"
                >
                  <td className="relative px-3 py-2.5 align-middle whitespace-nowrap">
                    <Link
                      href={`/correspondence/${row.id}`}
                      className="text-primary font-mono text-[0.8125rem] font-semibold underline-offset-2 hover:underline"
                    >
                      <span className="absolute inset-0" aria-hidden="true" />
                      {row.referenceNumber}
                    </Link>
                  </td>

                  <td className="max-w-[15rem] px-3 py-2.5 align-middle">
                    <p className="truncate text-[0.8125rem] font-medium">
                      {row.studentName}
                    </p>
                    <p className="text-muted-foreground truncate text-[0.6875rem]">
                      {row.subject}
                    </p>
                  </td>

                  {showDestination ? (
                    <td className="px-3 py-2.5 align-middle text-[0.8125rem] whitespace-nowrap">
                      {row.destinationOffice?.officeName ?? "Not yet dispatched"}
                    </td>
                  ) : null}

                  <td className="px-3 py-2.5 align-middle">
                    <StatusBadge
                      status={row.status}
                      handoffState={handoffState}
                      size="sm"
                    />
                  </td>

                  <td className="px-3 py-2.5 text-right align-middle whitespace-nowrap">
                    <span
                      className={cn("tabular text-xs", AGE_TONES[age.tone])}
                      title={`${age.longLabel} — received ${formatDate(row.dateReceived)}`}
                    >
                      {age.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="divide-y sm:hidden">
        {rows.map((row) => {
          const age = describeAge(row.dateReceived, overdueAfterDays);
          const handoffState = row.handoffs?.[0]?.state ?? null;

          return (
            <li key={row.id}>
              <Link
                href={`/correspondence/${row.id}`}
                className="hover:bg-accent/40 block space-y-2 px-4 py-3 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold">
                    {row.referenceNumber}
                  </span>
                  <span className={cn("tabular text-xs", AGE_TONES[age.tone])}>
                    {age.label}
                  </span>
                </div>
                <p className="text-sm font-medium">{row.studentName}</p>
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <StatusBadge
                    status={row.status}
                    handoffState={handoffState}
                    size="sm"
                  />
                  <span className="text-muted-foreground text-[0.6875rem]">
                    {row.destinationOffice?.officeName ?? "Not routed"}
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
