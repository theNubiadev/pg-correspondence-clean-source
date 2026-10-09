import {
  differenceInCalendarDays,
  format,
  formatDistanceToNowStrict,
  isValid,
} from "date-fns";

/** Nigerian institutional convention: day first, no ambiguity. */
export const DATE_FORMAT = "dd MMM yyyy";
export const DATE_TIME_FORMAT = "dd MMM yyyy, HH:mm";
export const TIME_FORMAT = "HH:mm";

type DateLike = Date | string | number | null | undefined;

function toDate(value: DateLike): Date | null {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value);
  return isValid(date) ? date : null;
}

export function formatDate(value: DateLike, fallback = "—"): string {
  const date = toDate(value);
  return date ? format(date, DATE_FORMAT) : fallback;
}

export function formatDateTime(value: DateLike, fallback = "—"): string {
  const date = toDate(value);
  return date ? format(date, DATE_TIME_FORMAT) : fallback;
}

export function formatTime(value: DateLike, fallback = "—"): string {
  const date = toDate(value);
  return date ? format(date, TIME_FORMAT) : fallback;
}

/** For `<input type="date">` values. */
export function toDateInputValue(value: DateLike): string {
  const date = toDate(value);
  return date ? format(date, "yyyy-MM-dd") : "";
}

export function formatRelative(value: DateLike, fallback = "—"): string {
  const date = toDate(value);
  if (!date) return fallback;
  return `${formatDistanceToNowStrict(date, { addSuffix: true })}`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "0";
  return new Intl.NumberFormat("en-NG").format(value);
}

export function formatPercent(value: number, fractionDigits = 0): string {
  return `${value.toFixed(fractionDigits)}%`;
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const size = bytes / 1024 ** exponent;
  return `${size.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

/**
 * Turns a span of hours into the phrasing the registry actually uses when
 * reporting turnaround, e.g. "3 days 4 hrs".
 */
export function formatDuration(hours: number | null | undefined): string {
  if (hours === null || hours === undefined || Number.isNaN(hours)) return "—";
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 24) return `${hours.toFixed(1)} hrs`;

  const days = Math.floor(hours / 24);
  const remainder = Math.round(hours % 24);
  return remainder > 0
    ? `${days} ${days === 1 ? "day" : "days"} ${remainder} hrs`
    : `${days} ${days === 1 ? "day" : "days"}`;
}

export type DueState = {
  label: string;
  /** Negative when the deadline has passed. */
  daysRemaining: number | null;
  tone: "neutral" | "warning" | "danger" | "success";
};

/** Drives the "due in 2 days" / "3 days overdue" chip on the register. */
export function describeDueDate(
  expected: DateLike,
  closedAt: DateLike = null,
): DueState {
  const due = toDate(expected);
  if (!due) return { label: "No deadline", daysRemaining: null, tone: "neutral" };

  const closed = toDate(closedAt);
  if (closed) {
    const overrun = differenceInCalendarDays(closed, due);
    return overrun > 0
      ? { label: `Closed ${overrun}d late`, daysRemaining: -overrun, tone: "warning" }
      : { label: "Closed on time", daysRemaining: -overrun, tone: "success" };
  }

  const days = differenceInCalendarDays(due, new Date());
  if (days < 0) {
    return {
      label: `${Math.abs(days)} ${Math.abs(days) === 1 ? "day" : "days"} overdue`,
      daysRemaining: days,
      tone: "danger",
    };
  }
  if (days === 0) return { label: "Due today", daysRemaining: 0, tone: "warning" };
  if (days <= 2) {
    return { label: `Due in ${days}d`, daysRemaining: days, tone: "warning" };
  }
  return { label: `Due in ${days}d`, daysRemaining: days, tone: "neutral" };
}

export type AgeState = {
  /** Compact form for table cells, e.g. "12d". */
  label: string;
  /** Spoken form for tooltips and screen readers. */
  longLabel: string;
  days: number;
  tone: "neutral" | "warning" | "danger";
};

/**
 * How long a letter has been sitting in the register.
 *
 * The register has no per-letter deadline, so age since receipt is the only
 * honest urgency signal available — and it is the one the Provost's office
 * already uses verbally ("that one has been with Finance for two weeks").
 */
export function describeAge(received: DateLike, overdueAfterDays = 7): AgeState {
  const date = toDate(received);
  if (!date) {
    return { label: "—", longLabel: "Unknown age", days: 0, tone: "neutral" };
  }

  const days = Math.max(0, differenceInCalendarDays(new Date(), date));
  const longLabel =
    days === 0
      ? "Received today"
      : `${days} ${days === 1 ? "day" : "days"} in the register`;

  return {
    label: days === 0 ? "Today" : `${days}d`,
    longLabel,
    days,
    tone:
      days >= overdueAfterDays
        ? "danger"
        : days >= Math.ceil(overdueAfterDays / 2)
          ? "warning"
          : "neutral",
  };
}

export function initialsOf(first?: string | null, last?: string | null): string {
  return `${first?.charAt(0) ?? ""}${last?.charAt(0) ?? ""}`.toUpperCase() || "?";
}

export function fullNameOf(person: {
  title?: string | null;
  firstName: string;
  lastName: string;
}): string {
  return [person.title, person.firstName, person.lastName]
    .filter(Boolean)
    .join(" ");
}

export function truncate(value: string, length = 72): string {
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}

/** Turns SCREAMING_SNAKE enum values into readable text as a last resort. */
export function humanizeEnum(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part, index) =>
      index === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part,
    )
    .join(" ");
}
