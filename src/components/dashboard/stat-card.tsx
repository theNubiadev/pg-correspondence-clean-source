"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import { getIcon } from "@/components/layout/nav-icon";

export type StatTone = "neutral" | "primary" | "warning" | "danger" | "success";

const TONES: Record<StatTone, { well: string; rail: string; hover: string }> = {
  neutral: {
    well: "bg-muted text-muted-foreground",
    rail: "bg-border",
    hover: "hover:border-border",
  },
  primary: {
    well: "bg-primary/10 text-primary",
    rail: "bg-primary",
    hover: "hover:border-primary/35",
  },
  warning: {
    well: "bg-warning/12 text-warning",
    rail: "bg-warning",
    hover: "hover:border-warning/35",
  },
  danger: {
    well: "bg-destructive/10 text-destructive",
    rail: "bg-destructive",
    hover: "hover:border-destructive/35",
  },
  success: {
    well: "bg-success/10 text-success",
    rail: "bg-success",
    hover: "hover:border-success/35",
  },
};

/**
 * A headline figure.
 *
 * The number is by far the largest thing in the card, because on a dashboard
 * staff glance at twenty times a day the figure is the content and the label is
 * only there to say what it counts. The whole card links into a pre-filtered
 * register view — a figure you cannot click into is a dead end for someone
 * trying to act on it.
 */
export function StatCard({
  label,
  value,
  delta,
  icon,
  tone = "neutral",
  href,
  emphasis = false,
  className,
}: {
  label: string;
  value: number | string;
  /** Short metadata line, e.g. "3 arrived today" or "none overdue". */
  delta?: string;
  icon: string;
  tone?: StatTone;
  href?: string;
  /** Draws the tone rail solid — used for the figure that needs attention. */
  emphasis?: boolean;
  className?: string;
}) {
  const Icon = getIcon(icon);
  const tones = TONES[tone];
  const isZero = value === 0;

  const content = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-0 left-0 w-[3px] rounded-l-xl transition-opacity",
          tones.rail,
          emphasis ? "opacity-100" : "opacity-0 group-hover:opacity-60",
        )}
      />

      <div className="flex items-start justify-between gap-2">
        <p className="text-muted-foreground text-[0.6875rem] font-semibold tracking-[0.06em] uppercase">
          {label}
        </p>
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-md transition-transform group-hover:scale-105",
            tones.well,
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <p
          className={cn(
            "tabular text-[2.125rem] leading-none font-semibold tracking-[-0.035em]",
            isZero && "text-muted-foreground/55",
          )}
        >
          {typeof value === "number" ? formatNumber(value) : value}
        </p>
        {delta ? (
          <p className="text-muted-foreground truncate text-[0.75rem] leading-tight">
            {delta}
          </p>
        ) : null}
        {href ? (
          <ArrowUpRight
            className="text-muted-foreground/0 group-hover:text-muted-foreground ml-auto size-3.5 shrink-0 self-start transition-colors"
            aria-hidden="true"
          />
        ) : null}
      </div>
    </>
  );

  const shell = cn(
    "surface group focus-visible:ring-ring/45 relative block overflow-hidden px-3.5 py-3 transition-[box-shadow,border-color] focus-visible:ring-[3px] focus-visible:outline-none",
    href && "hover:shadow-[var(--shadow-float)]",
    href && tones.hover,
    className,
  );

  if (!href) return <div className={shell}>{content}</div>;

  return (
    <Link href={href} className={shell}>
      {content}
    </Link>
  );
}
