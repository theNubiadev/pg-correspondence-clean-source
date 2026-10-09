"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import {
  isActivePath,
  type NavSection,
  type ShellCounts,
} from "@/lib/navigation";
import { NavIcon } from "@/components/layout/nav-icon";

/**
 * The primary navigation list.
 *
 * The active item is marked three ways — a filled surface, a coloured indigo
 * rail and `aria-current` — so it reads as selected regardless of whether the
 * user perceives colour. Saved views carry live counts, which is what stops the
 * list reading as a flat menu of pages.
 */
export function SidebarNav({
  sections,
  counts,
  onNavigate,
  compact = false,
}: {
  sections: NavSection[];
  counts: ShellCounts;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentView = searchParams.get("view");

  return (
    <nav aria-label="Main navigation" className="space-y-5">
      {sections.map((section) => (
        <div key={section.title}>
          <h2 className="text-muted-foreground/75 px-3 pb-1.5 text-[0.625rem] font-semibold tracking-[0.09em] uppercase">
            {section.title}
          </h2>

          <ul className="space-y-px">
            {section.items.map((item) => {
              const active = isActivePath(pathname, item, currentView);
              const count = item.badge ? counts[item.badge] : undefined;
              const danger = item.badgeTone === "danger" && (count ?? 0) > 0;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    title={compact ? item.description : undefined}
                    className={cn(
                      "group focus-visible:ring-ring/45 relative flex items-center gap-2.5 rounded-lg px-3 py-[0.4375rem] text-[0.8125rem] font-medium transition-colors focus-visible:ring-[3px] focus-visible:outline-none",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                    )}
                  >
                    {active ? (
                      <span
                        className="bg-primary absolute inset-y-1.5 left-0 w-[3px] rounded-full"
                        aria-hidden="true"
                      />
                    ) : null}

                    <NavIcon
                      name={item.icon}
                      className={cn(
                        "size-4 shrink-0 transition-colors",
                        active
                          ? "text-primary"
                          : danger
                            ? "text-destructive/70 group-hover:text-destructive"
                            : "text-muted-foreground/70 group-hover:text-foreground",
                      )}
                    />

                    <span className="flex-1 truncate">{item.label}</span>

                    {count === undefined ? null : (
                      <span
                        className={cn(
                          "tabular shrink-0 rounded px-1.5 py-0.5 text-[0.6875rem] font-semibold",
                          count === 0
                            ? "text-muted-foreground/45"
                            : danger
                              ? "bg-destructive/12 text-destructive"
                              : "bg-primary/10 text-primary",
                        )}
                      >
                        {formatNumber(count)}
                        <span className="sr-only"> {item.label.toLowerCase()}</span>
                      </span>
                    )}
                  </Link>

                  {compact ? null : (
                    <p className="sr-only">{item.description}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
