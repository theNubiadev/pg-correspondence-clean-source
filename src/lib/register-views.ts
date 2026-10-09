import type { Prisma } from "@prisma/client";

import { OPEN_STATUSES, OVERDUE_AFTER_DAYS, STATUS_META } from "@/lib/constants";

/**
 * Saved views over the register.
 *
 * A single `status` filter cannot express the questions staff actually ask —
 * "what is waiting on us?" spans two statuses, and "what has gone stale?" is a
 * status *and* an age. Encoding those as named views keeps the URL shareable
 * (`/correspondence?view=overdue`) and keeps the same definition behind the
 * dashboard chips, the register toolbar and the exported CSV.
 */
export const REGISTER_VIEW_KEYS = [
  "awaiting",
  "in-progress",
  "kiv",
  "overdue",
  "today",
  "completed",
  "closed",
  "physical-awaiting",
  "physical-discrepancy",
] as const;

export type RegisterViewKey = (typeof REGISTER_VIEW_KEYS)[number];

export type RegisterView = {
  key: RegisterViewKey;
  label: string;
  description: string;
  /** CSS custom property used for the chip's status dot. */
  token: string;
};

export const REGISTER_VIEWS: RegisterView[] = [
  {
    key: "awaiting",
    label: "Needs Provost attention",
    description: "Still with the Provost Office — action needed.",
    token: STATUS_META.AWAITING_PROVOST_ACTION.token,
  },
  {
    key: "in-progress",
    label: "Provost has attended",
    description: "Attended in Provost Office; still there until sent to a unit.",
    token: STATUS_META.TREATED.token,
  },
  {
    key: "kiv",
    label: "Keep in view",
    description: "Set aside for later — still open.",
    token: STATUS_META.KIV.token,
  },
  {
    key: "overdue",
    label: "Overdue",
    description: `Still open after ${OVERDUE_AFTER_DAYS} days.`,
    token: "--destructive",
  },
  {
    key: "today",
    label: "Received today",
    description: "Logged since midnight.",
    token: STATUS_META.RECEIVED.token,
  },
  {
    key: "completed",
    label: "Out to units",
    description: "Sent to a unit — may still be waiting for the physical copy.",
    token: STATUS_META.DISPATCHED.token,
  },
  {
    key: "closed",
    label: "Closed",
    description: "Finished — no longer active.",
    token: STATUS_META.CLOSED.token,
  },
  {
    key: "physical-awaiting",
    label: "Waiting for physical copy",
    description: "Sent to a unit; paper copy not yet confirmed.",
    token: "--status-awaiting-approval",
  },
  {
    key: "physical-discrepancy",
    label: "Physical copy missing",
    description: "Unit reported the paper copy has not arrived.",
    token: "--destructive",
  },
];

export function isRegisterViewKey(value: unknown): value is RegisterViewKey {
  return (
    typeof value === "string" &&
    (REGISTER_VIEW_KEYS as readonly string[]).includes(value)
  );
}

export function registerView(key?: string | null): RegisterView | undefined {
  return REGISTER_VIEWS.find((view) => view.key === key);
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function staleBefore(): Date {
  const d = startOfToday();
  d.setDate(d.getDate() - OVERDUE_AFTER_DAYS);
  return d;
}

/** The query fragment for a view. Empty object when no view is selected. */
export function registerViewWhere(
  key?: RegisterViewKey,
): Prisma.CorrespondenceWhereInput {
  switch (key) {
    case "awaiting":
      return { status: { in: ["RECEIVED", "AWAITING_PROVOST_ACTION"] } };
    case "in-progress":
      return { status: "TREATED" };
    case "kiv":
      return { status: "KIV" };
    case "overdue":
      return {
        status: { in: OPEN_STATUSES },
        dateReceived: { lt: staleBefore() },
      };
    case "today":
      return { dateReceived: { gte: startOfToday() } };
    case "completed":
      return { status: "DISPATCHED" };
    case "closed":
      return { status: "CLOSED" };
    case "physical-awaiting":
      return {
        handoffs: { some: { current: true, state: "PENDING" } },
      };
    case "physical-discrepancy":
      return {
        handoffs: { some: { current: true, state: "NOT_RECEIVED" } },
      };
    default:
      return {};
  }
}
