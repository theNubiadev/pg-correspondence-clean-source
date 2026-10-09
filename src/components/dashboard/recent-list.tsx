import Link from "next/link";

import { StatusBadge } from "@/components/correspondence/status-badge";
import { formatDate } from "@/lib/format";
import type { CorrespondenceStatus } from "@prisma/client";

type RecentItem = {
  id: string;
  referenceNumber: string;
  studentName: string;
  subject: string;
  status: CorrespondenceStatus;
  dateReceived: Date;
  destinationOffice: { officeName: string };
};

export function RecentCorrespondenceList({ items }: { items: RecentItem[] }) {
  if (!items.length) {
    return (
      <p className="text-muted-foreground py-6 text-sm">
        No correspondence logged yet.
      </p>
    );
  }

  return (
    <ul className="divide-y">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`/correspondence/${item.id}`}
            className="hover:bg-accent/40 flex flex-wrap items-center justify-between gap-3 px-1 py-3 transition-colors"
          >
            <div className="min-w-0 space-y-1">
              <p className="font-mono text-xs font-semibold">{item.referenceNumber}</p>
              <p className="text-sm font-medium">{item.studentName}</p>
              <p className="text-muted-foreground truncate text-xs">{item.subject}</p>
              <p className="text-muted-foreground text-xs">
                {item.destinationOffice?.officeName ?? "Not routed"} ·{" "}
                {formatDate(item.dateReceived)}
              </p>
            </div>
            <StatusBadge status={item.status} size="sm" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
