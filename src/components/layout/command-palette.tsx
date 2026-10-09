"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2, Search } from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { StatusBadge } from "@/components/correspondence/status-badge";
import { NavIcon } from "@/components/layout/nav-icon";
import { formatDate } from "@/lib/format";
import type { NavSection } from "@/lib/navigation";
import type { CorrespondenceStatus } from "@prisma/client";
import type { SearchHit } from "@/server/queries/search";

/**
 * Global search and jump-to.
 *
 * Opens on Ctrl/Cmd-K for people who know the shortcut, and from the visible
 * "Search" button in the header for everyone else — the shortcut is never the
 * only way in. Typing a reference number jumps straight to that file.
 */
export function CommandPalette({
  sections,
  open,
  onOpenChange,
}: {
  sections: NavSection[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        onOpenChange(!open);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  const trimmed = query.trim();
  const { data, isFetching, isError } = useQuery({
    queryKey: ["global-search", trimmed],
    enabled: open && trimmed.length >= 2,
    staleTime: 15_000,
    queryFn: async ({ signal }: { signal: AbortSignal }) => {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(trimmed)}`,
        { signal },
      );
      if (!response.ok) throw new Error("Search is unavailable");
      return (await response.json()) as { results: SearchHit[] };
    },
  });

  function go(href: string) {
    onOpenChange(false);
    setQuery("");
    router.push(href);
  }

  const results = data?.results ?? [];
  const allPages = sections.flatMap((section) => section.items);

  /*
   * cmdk's own filtering is switched off because correspondence results come
   * pre-ranked from Postgres full-text search and may match on body text that
   * is not visible in the row. Pages are therefore filtered here instead, so
   * typing "report" still jumps to Reports alongside any matching letters.
   */
  const needle = trimmed.toLowerCase();
  const pages =
    needle.length < 2
      ? allPages
      : allPages.filter(
          (item) =>
            item.label.toLowerCase().includes(needle) ||
            item.description.toLowerCase().includes(needle),
        );

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search the register"
      description="Find correspondence by reference number, applicant, subject or matric number."
      shouldFilter={false}
    >
      <CommandInput
        placeholder="Search a reference number, name, matric number or subject…"
        value={query}
        onValueChange={setQuery}
      />

      <CommandList className="max-h-[26rem]">
        {trimmed.length >= 2 ? (
          <>
            {isFetching && results.length === 0 ? (
              <div className="text-muted-foreground flex items-center gap-2 px-4 py-8 text-sm">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Searching the register…
              </div>
            ) : null}

            {isError ? (
              <div className="px-4 py-8 text-center" role="alert">
                <p className="text-sm font-medium">Search is unavailable</p>
                <p className="text-muted-foreground mx-auto mt-1 max-w-xs text-xs leading-relaxed">
                  Try again in a moment. Your sign-in is still active.
                </p>
              </div>
            ) : null}

            {!isError && !isFetching && results.length === 0 && pages.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-medium">Nothing found</p>
                <p className="text-muted-foreground mx-auto mt-1 max-w-xs text-xs leading-relaxed">
                  Check the spelling, or try just the number part of the
                  reference, such as 000124.
                </p>
              </div>
            ) : null}

            {results.length > 0 ? (
              <CommandGroup heading={`Correspondence (${results.length})`}>
                {results.map((hit: SearchHit) => (
                  <CommandItem
                    key={hit.id}
                    value={hit.id}
                    onSelect={() => go(`/correspondence/${hit.id}`)}
                    className="flex items-start gap-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold">
                          {hit.referenceNumber}
                        </span>
                        <StatusBadge
                          status={hit.status as CorrespondenceStatus}
                          size="sm"
                        />
                      </div>
                      <p className="mt-1 truncate text-sm">{hit.subject}</p>
                      <p className="text-muted-foreground mt-0.5 truncate text-xs">
                        {hit.studentName}
                        {hit.destinationOffice?.officeName
                          ? ` · ${hit.destinationOffice.officeName}`
                          : ""}
                        {` · received ${formatDate(hit.dateReceived)}`}
                      </p>
                    </div>
                    <ArrowRight
                      className="text-muted-foreground mt-1 size-4 shrink-0"
                      aria-hidden="true"
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {pages.length > 0 ? <PageGroup pages={pages} onGo={go} /> : null}
          </>
        ) : (
          <PageGroup pages={pages} onGo={go} />
        )}
      </CommandList>
    </CommandDialog>
  );
}

function PageGroup({
  pages,
  onGo,
}: {
  pages: NavSection["items"];
  onGo: (href: string) => void;
}) {
  return (
    <CommandGroup heading="Go to">
      {pages.map((item) => (
        <CommandItem
          key={item.href}
          value={item.href}
          onSelect={() => onGo(item.href)}
          className="gap-3 py-2"
        >
          <NavIcon name={item.icon} className="text-muted-foreground size-4" />
          <div className="min-w-0 flex-1">
            <p className="text-sm">{item.label}</p>
            <p className="text-muted-foreground truncate text-xs">
              {item.description}
            </p>
          </div>
        </CommandItem>
      ))}
    </CommandGroup>
  );
}

/** The visible entry point in the header. */
export function SearchTrigger({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
  }, []);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group border-border/80 bg-card text-muted-foreground hover:border-border hover:text-foreground focus-visible:ring-ring/45 flex h-9 items-center gap-2 rounded-lg border px-3 text-sm transition-colors focus-visible:ring-[3px] focus-visible:outline-none ${className ?? ""}`}
    >
      <Search className="size-4 shrink-0" aria-hidden="true" />
      <span className="hidden sm:inline">Search all correspondence</span>
      <span className="sm:hidden">Search</span>
      <kbd className="bg-muted text-muted-foreground ml-auto hidden rounded border px-1.5 py-0.5 font-sans text-[0.6875rem] font-medium lg:inline-block">
        {isMac ? "⌘" : "Ctrl "}K
      </kbd>
    </button>
  );
}
