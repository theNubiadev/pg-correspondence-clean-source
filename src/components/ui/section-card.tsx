"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A titled panel. Every dashboard and detail section uses this, which is what
 * keeps spacing, border radius and heading weight identical across pages
 * without repeating the classes twenty times.
 */
export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  description?: string;
  action?: { label: string; href: string } | React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  const isLinkAction =
    action !== null &&
    typeof action === "object" &&
    action !== undefined &&
    "href" in (action as Record<string, unknown>);

  return (
    <section className={cn("surface flex flex-col", className)}>
      <header className="flex items-start justify-between gap-4 border-b px-4 py-2.5">
        <div className="min-w-0">
          <h2 className="text-[0.9375rem] font-semibold tracking-[-0.01em]">
            {title}
          </h2>
          {description ? (
            <p className="text-muted-foreground mt-0.5 text-[0.75rem] leading-snug">
              {description}
            </p>
          ) : null}
        </div>

        {isLinkAction ? (
          <Link
            href={(action as { href: string }).href}
            className="text-primary focus-visible:ring-ring/45 inline-flex shrink-0 items-center gap-1 rounded text-xs font-medium hover:underline focus-visible:ring-[3px] focus-visible:outline-none"
          >
            {(action as { label: string }).label}
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        ) : (
          (action as React.ReactNode)
        )}
      </header>

      <div className={cn("flex-1 p-4", bodyClassName)}>{children}</div>
    </section>
  );
}
