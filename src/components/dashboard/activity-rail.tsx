import Link from "next/link";
import type { CorrespondenceStatus } from "@prisma/client";

import { STATUS_META } from "@/lib/constants";
import { formatRelative, truncate } from "@/lib/format";

export type ActivityItem = {
  id: string;
  referenceNumber: string;
  studentName: string;
  subject: string;
  status: CorrespondenceStatus;
  updatedAt: Date;
};

/**
 * Latest status movement across the register.
 *
 * The manual register book had no way of answering "what changed while I was
 * away?" — you had to read the whole page. This rail is that answer, and it is
 * the closest thing the system has to the movement log the old book implied.
 */
export function ActivityRail({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-muted-foreground px-1 py-6 text-center text-xs">
        No activity recorded yet.
      </p>
    );
  }

  return (
    <ol className="relative space-y-3">
      <span
        aria-hidden="true"
        className="bg-border absolute top-1.5 bottom-1.5 left-[3px] w-px"
      />

      {items.map((item) => {
        const meta = STATUS_META[item.status];

        return (
          <li key={item.id} className="relative pl-4">
            <span
              aria-hidden="true"
              className="ring-card absolute top-1.5 left-0 size-[7px] rounded-full ring-2"
              style={{ backgroundColor: `var(${meta.token})` }}
            />

            <Link
              href={`/correspondence/${item.id}`}
              className="focus-visible:ring-ring/45 group block rounded focus-visible:ring-[3px] focus-visible:outline-none"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-[0.6875rem] font-semibold">
                  {item.referenceNumber}
                </span>
                <span className="text-muted-foreground shrink-0 text-[0.6875rem] whitespace-nowrap">
                  {formatRelative(item.updatedAt)}
                </span>
              </div>
              <p className="group-hover:underline mt-0.5 truncate text-[0.8125rem] font-medium">
                {item.studentName}
              </p>
              <p className="text-muted-foreground text-[0.6875rem] leading-snug">
                <span style={{ color: `var(${meta.token})` }} className="font-medium">
                  {meta.label}
                </span>
                {" · "}
                {truncate(item.subject, 44)}
              </p>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
