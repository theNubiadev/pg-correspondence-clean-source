import type { CorrespondenceStatus } from "@prisma/client";

import {
  progressStatus,
  STATUS_FLOW,
  STATUS_META,
  statusProgressPercent,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ProgressView } from "@/lib/workflow/view-model";

export function StatusProgress({
  status,
  statusBeforeKiv,
  subject,
  destinationName,
  compact = false,
  className,
  view,
}: {
  status: CorrespondenceStatus;
  statusBeforeKiv?: CorrespondenceStatus | null;
  subject?: string | null;
  destinationName?: string | null;
  compact?: boolean;
  className?: string;
  view?: ProgressView;
}) {
  const pipelineStatus = progressStatus(status, statusBeforeKiv);
  const fallbackPercent = statusProgressPercent(pipelineStatus);
  const currentIndex = STATUS_FLOW.indexOf(pipelineStatus);
  const subjectText = subject?.trim() || null;
  const isKiv = status === "KIV";
  const displayLabel = view?.title
    ?? (isKiv
      ? `${STATUS_META.KIV.label} · was ${STATUS_META[pipelineStatus].label}`
      : STATUS_META[status].label);
  const percent = view?.percent ?? fallbackPercent;
  const steps =
    view?.steps ??
    STATUS_FLOW.map((step, index) => ({
      key: step,
      label:
        destinationName && (step === "DISPATCHED" || step === "CLOSED")
          ? `${STATUS_META[step].label} · ${destinationName}`
          : STATUS_META[step].label,
      done: index <= currentIndex,
      active: !isKiv && index === currentIndex,
    }));

  if (compact) {
    return (
      <div
        className={cn("space-y-1", className)}
        title={
          subjectText ? `${displayLabel} — ${subjectText}` : displayLabel
        }
      >
        {subjectText ? (
          <p className="text-foreground line-clamp-2 text-[0.7rem] font-medium leading-snug">
            {subjectText}
          </p>
        ) : null}
        <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-muted-foreground text-[0.65rem] tabular-nums">
          {displayLabel}
          {view?.kind !== "handoff" && destinationName ? ` · ${destinationName}` : ""}{" "}
          · {percent}%
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {subjectText ? (
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Subject
          </p>
          <p className="text-sm font-medium leading-relaxed">{subjectText}</p>
        </div>
      ) : null}
      {isKiv ? (
        <p className="rounded-md border border-[color:var(--status-kiv)]/40 bg-[color:var(--status-kiv)]/10 px-3 py-2 text-sm">
          On <span className="font-medium">Keep in view</span> — parked from{" "}
          {STATUS_META[pipelineStatus].label}. Resume when you are ready to
          continue.
        </p>
      ) : null}
      {view?.description ? (
        <p className="text-muted-foreground text-sm">{view.description}</p>
      ) : null}
      <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full transition-all"
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progress: ${displayLabel}`}
        />
      </div>
      <ol
        className={cn(
          "grid gap-2",
          steps.length >= 5 ? "sm:grid-cols-5" : "sm:grid-cols-3",
        )}
      >
        {steps.map((step) => (
          <li
            key={step.key}
            className={cn(
              "rounded-md border px-2 py-1.5 text-center text-[0.7rem] leading-tight",
              step.done
                ? "border-primary/30 bg-primary/5 text-foreground"
                : "border-border text-muted-foreground",
              step.active && "ring-primary/40 ring-2",
            )}
          >
            {step.label}
          </li>
        ))}
      </ol>
    </div>
  );
}
