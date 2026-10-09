import Link from "next/link";

import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import { REGISTER_VIEWS, type RegisterViewKey } from "@/lib/register-views";

export type ViewCounts = Partial<Record<RegisterViewKey, number>>;

/**
 * The saved-view switcher.
 *
 * Shared by the dashboard and the register so that "Overdue" means the same
 * thing, looks the same and produces the same URL wherever it is clicked.
 */
export function ViewTabs({
  activeView,
  counts,
  total,
  className,
}: {
  activeView?: RegisterViewKey;
  counts?: ViewCounts;
  /** Count for the "All" tab. Omitted when it would cost an extra query. */
  total?: number;
  className?: string;
}) {
  return (
    <nav
      aria-label="Register views"
      className={cn("flex items-center gap-1 overflow-x-auto", className)}
    >
      <ViewChip
        href="/correspondence"
        label="All"
        count={total}
        active={!activeView}
      />
      {REGISTER_VIEWS.map((view) => (
        <ViewChip
          key={view.key}
          href={`/correspondence?view=${view.key}`}
          label={view.label}
          title={view.description}
          count={counts?.[view.key]}
          token={view.token}
          active={activeView === view.key}
        />
      ))}
    </nav>
  );
}

function ViewChip({
  href,
  label,
  count,
  token,
  title,
  active,
}: {
  href: string;
  label: string;
  count?: number;
  token?: string;
  title?: string;
  active?: boolean;
}) {
  const empty = count === 0;

  return (
    <Link
      href={href}
      title={title}
      aria-current={active ? "page" : undefined}
      className={cn(
        "focus-visible:ring-ring/45 inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[0.8125rem] font-medium whitespace-nowrap transition-colors focus-visible:ring-[3px] focus-visible:outline-none",
        active
          ? "bg-background text-foreground shadow-[var(--shadow-elevated)]"
          : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
      )}
    >
      {token ? (
        <span
          aria-hidden="true"
          className={cn("size-1.5 shrink-0 rounded-full", empty && "opacity-40")}
          style={{ backgroundColor: `var(${token})` }}
        />
      ) : null}
      {label}
      {count === undefined ? null : (
        <span
          className={cn(
            "tabular text-[0.75rem]",
            empty ? "text-muted-foreground/50" : "text-muted-foreground",
          )}
        >
          {formatNumber(count)}
        </span>
      )}
    </Link>
  );
}
