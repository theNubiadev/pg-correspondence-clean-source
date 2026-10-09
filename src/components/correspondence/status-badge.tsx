import type { CorrespondenceStatus, PhysicalReceiptState } from "@prisma/client";

import { cn } from "@/lib/utils";
import { STATUS_META } from "@/lib/constants";
import {
  displayStatusDescription,
  displayStatusLabel,
  displayStatusToken,
} from "@/lib/workflow/view-model";

export function StatusBadge({
  status,
  handoffState,
  className,
  size = "default",
}: {
  status: CorrespondenceStatus;
  handoffState?: PhysicalReceiptState | null;
  className?: string;
  size?: "default" | "sm";
}) {
  const label = displayStatusLabel(status, handoffState);
  const token = displayStatusToken(status, handoffState);
  const description = displayStatusDescription(status, handoffState);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap",
        size === "sm"
          ? "px-2 py-0.5 text-[0.6875rem]"
          : "px-2.5 py-1 text-xs",
        className,
      )}
      style={{
        borderColor: `color-mix(in oklab, var(${token}) 28%, transparent)`,
        backgroundColor: `color-mix(in oklab, var(${token}) 10%, transparent)`,
        color: `var(${token})`,
      }}
      title={description}
    >
      <span
        aria-hidden="true"
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: `var(${token})` }}
      />
      {label}
    </span>
  );
}

/** @deprecated Prefer StatusBadge with handoffState — kept for call sites that only have status. */
export function statusBadgeLabel(status: CorrespondenceStatus) {
  return STATUS_META[status].label;
}
