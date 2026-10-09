import Link from "next/link";
import type { CorrespondenceStatus } from "@prisma/client";

import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type Row = {
  key: string;
  label: string;
  count: number;
  href: string;
  /** CSS custom property for the row's colour. Falls back to the brand blue. */
  token?: string;
  title?: string;
};

/**
 * A ranked bar list.
 *
 * This replaces the donut and bar charts on the dashboard. A chart of five
 * records tells you nothing a list does not, but costs a chart library, a client
 * bundle and a legend you have to read across. The list is legible at two
 * records and still legible at two thousand, and every row is a link into the
 * filtered register.
 */
function BreakdownList({
  rows,
  emptyMessage,
}: {
  rows: Row[];
  emptyMessage: string;
}) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  if (total === 0) {
    return (
      <p className="text-muted-foreground px-1 py-6 text-center text-xs">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="space-y-2.5">
      {rows.map((row) => {
        const share = total === 0 ? 0 : (row.count / total) * 100;
        const color = `var(${row.token ?? "--primary"})`;

        return (
          <li key={row.key}>
            <Link
              href={row.href}
              title={row.title}
              className="focus-visible:ring-ring/45 group block rounded focus-visible:ring-[3px] focus-visible:outline-none"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      row.count === 0 && "opacity-40",
                    )}
                    style={{ backgroundColor: color }}
                  />
                  <span className="group-hover:text-foreground truncate text-[0.8125rem] font-medium">
                    {row.label}
                  </span>
                </span>
                <span className="flex shrink-0 items-baseline gap-1.5">
                  <span className="tabular text-[0.8125rem] font-semibold">
                    {formatNumber(row.count)}
                  </span>
                  <span className="text-muted-foreground tabular text-[0.6875rem]">
                    {Math.round(share)}%
                  </span>
                </span>
              </div>

              <div
                className="bg-muted mt-1.5 h-1.5 overflow-hidden rounded-full"
                role="presentation"
              >
                <div
                  className="h-full rounded-full transition-[width]"
                  style={{
                    width: `${Math.max(share, row.count > 0 ? 3 : 0)}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function StatusBreakdown({
  data,
}: {
  data: {
    status: CorrespondenceStatus;
    label: string;
    count: number;
    token: string;
  }[];
}) {
  return (
    <BreakdownList
      rows={data.map((entry) => ({
        key: entry.status,
        label: entry.label,
        count: entry.count,
        token: entry.token,
        href: `/correspondence?status=${entry.status}`,
      }))}
      emptyMessage="No correspondence logged yet."
    />
  );
}

export function OfficeBreakdown({
  data,
  limit = 8,
}: {
  data: { id: string; name: string; count: number }[];
  limit?: number;
}) {
  return (
    <BreakdownList
      rows={data.slice(0, limit).map((entry) => ({
        key: entry.id,
        label: entry.name,
        count: entry.count,
        href: `/correspondence?destinationOfficeId=${entry.id}`,
        title: `Open the register filtered to ${entry.name}`,
      }))}
      emptyMessage="Nothing routed to a department yet."
    />
  );
}
