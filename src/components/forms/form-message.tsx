"use client";

import { CheckCircle2, Info, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ActionState } from "@/server/actions/types";

const TONES = {
  success: {
    icon: CheckCircle2,
    className:
      "border-success/25 bg-success/8 text-success-foreground [--icon:var(--success)]",
  },
  error: {
    icon: TriangleAlert,
    className:
      "border-destructive/25 bg-destructive/8 text-foreground [--icon:var(--destructive)]",
  },
  info: {
    icon: Info,
    className: "border-primary/20 bg-primary/6 text-foreground [--icon:var(--primary)]",
  },
} as const;

/**
 * The single banner a form uses to report the outcome of a Server Action.
 */
export function FormMessage({
  state,
  className,
}: {
  state: ActionState<unknown>;
  className?: string;
}) {
  const visible = state.status !== "idle" && Boolean(state.message);
  const tone = state.status === "success" ? TONES.success : TONES.error;
  const Icon = tone.icon;

  if (!visible) {
    return (
      <div
        aria-live={state.status === "error" ? "assertive" : "polite"}
        aria-atomic="true"
        className={className}
      />
    );
  }

  return (
    <div
      aria-live={state.status === "error" ? "assertive" : "polite"}
      aria-atomic="true"
      className={className}
    >
      <div
        className={cn(
          "flex items-start gap-2.5 rounded-md border px-3.5 py-3 text-sm",
          tone.className,
        )}
        role={state.status === "error" ? "alert" : "status"}
      >
        <Icon
          className="mt-0.5 size-4 shrink-0 text-[var(--icon)]"
          aria-hidden="true"
        />
        <p className="leading-relaxed">{state.message}</p>
      </div>
    </div>
  );
}
