"use client";

import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ViewTabs, type ViewCounts } from "@/components/correspondence/view-tabs";
import type { RegisterViewKey } from "@/lib/register-views";

export type { ViewCounts };

/**
 * The register's front door.
 *
 * Search is the single most-used action in the building — someone walks up to
 * the counter holding a slip with a reference number on it — so it is the
 * largest control on the page and sits above every figure. The tabs underneath
 * carry live counts, which turns them from decoration into a triage summary you
 * can click.
 */
export function RegisterSearch({
  counts,
  total,
  activeView,
  placeholder,
  heading = "Search this queue",
}: {
  counts: ViewCounts;
  total: number;
  activeView?: RegisterViewKey;
  placeholder?: string;
  heading?: string;
}) {
  return (
    <section
      className="surface overflow-hidden"
      aria-labelledby="register-search-heading"
    >
      <h2 id="register-search-heading" className="px-3 pt-3 text-xs font-medium">
        {heading}
      </h2>

      <form action="/correspondence" method="get" className="flex items-center gap-2 p-2">
        <div className="relative flex-1">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="search"
            name="q"
            aria-label="Search by reference number, name, matriculation number or subject"
            placeholder={
              placeholder ??
              "Search by reference (PROV/2026/000123), name, matric number or subject…"
            }
            className="placeholder:text-muted-foreground/80 h-11 w-full rounded-lg border-0 bg-transparent pr-3 pl-10 text-[0.9375rem] outline-none"
          />
        </div>
        <Button type="submit" size="lg" className="h-11 shrink-0 px-5">
          Search
        </Button>
      </form>

      <ViewTabs
        activeView={activeView}
        counts={counts}
        total={total}
        className="bg-muted/35 border-t px-2 py-1.5"
      />
    </section>
  );
}
