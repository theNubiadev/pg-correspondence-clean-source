"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type Breadcrumb = { label: string; href?: string };

/**
 * The heading block every page opens with.
 *
 * The description is not decoration: on an internal tool used by people who did
 * not choose to be here, a sentence explaining what a page is for removes most
 * of the "what am I looking at" friction. Every page supplies one.
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  meta,
  breadcrumbs,
  actions,
  dense = false,
  className,
  children,
}: {
  title: string;
  description?: string;
  /** Small label above the title, e.g. the owning office. */
  eyebrow?: string;
  /** Right-hand metadata rendered beside the description, e.g. "Updated 11:42". */
  meta?: React.ReactNode;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
  /**
   * Trims the band for pages whose content starts immediately below it. The
   * dashboard uses this: a greeting-sized header there costs a row of the queue.
   */
  dense?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <header
      className={cn(
        "brand-wash border-b px-4 sm:px-6 lg:px-8",
        dense ? "pt-4 pb-4" : "pt-5 pb-6",
        className,
      )}
    >
      <div className="mx-auto max-w-[100rem]">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav aria-label="Breadcrumb" className="mb-2.5">
            <ol className="text-muted-foreground flex flex-wrap items-center gap-1 text-xs">
              {breadcrumbs.map((crumb, index) => (
                <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                  {index > 0 ? (
                    <ChevronRight
                      className="size-3.5 shrink-0 opacity-50"
                      aria-hidden="true"
                    />
                  ) : null}
                  {crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="hover:text-foreground rounded focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]/45 focus-visible:outline-none"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      className="text-foreground font-medium"
                      aria-current="page"
                    >
                      {crumb.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-muted-foreground mb-1 text-[0.6875rem] font-semibold tracking-[0.08em] uppercase">
                {eyebrow}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1
                className={cn(
                  "min-w-0 font-semibold tracking-[-0.025em]",
                  dense
                    ? "text-[1.5rem] leading-tight sm:text-[1.75rem]"
                    : "text-[1.625rem] leading-tight sm:text-[2rem]",
                )}
              >
                {title}
              </h1>

              {actions ? (
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {actions}
                </div>
              ) : null}
            </div>

            {description || meta ? (
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                {description ? (
                  <p className="text-muted-foreground max-w-2xl text-[0.8125rem] leading-snug">
                    {description}
                  </p>
                ) : null}
                {meta ? (
                  <div className="text-muted-foreground flex items-center gap-2 text-[0.75rem]">
                    {meta}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {children ? <div className={dense ? "mt-3" : "mt-4"}>{children}</div> : null}
      </div>
    </header>
  );
}

/** Standard page body wrapper: consistent gutters and max width everywhere. */
export function PageBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="px-4 py-5 sm:px-6 lg:px-8">
      <div className={cn("mx-auto max-w-[100rem]", className)}>{children}</div>
    </div>
  );
}
