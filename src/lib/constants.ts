import type { ApplicantType, CorrespondenceStatus, UserRole } from "@prisma/client";

export const APP_NAME =
  process.env.NEXT_PUBLIC_APP_NAME ?? "PG School Correspondence Register";
export const ORG_NAME =
  process.env.NEXT_PUBLIC_ORG_NAME ??
  "The Postgraduate College, University of Ibadan";
export const ORG_SHORT_NAME = "The Postgraduate College";
export const ORG_MOTTO = "Recte Sapere Fons";

export type StatusMeta = {
  label: string;
  description: string;
  token: string;
  open: boolean;
  order: number;
};

/**
 * Ordered workflow — each letter moves through these stages in sequence.
 * KIV is intentionally outside this pipeline: it parks a letter for later
 * review without advancing or closing it.
 */
export const STATUS_FLOW: CorrespondenceStatus[] = [
  "RECEIVED",
  "AWAITING_PROVOST_ACTION",
  "TREATED",
  "DISPATCHED",
  "CLOSED",
];

export const STATUS_META: Record<CorrespondenceStatus, StatusMeta> = {
  RECEIVED: {
    label: "Received",
    description: "Logged at the Provost's office.",
    token: "--status-received",
    open: true,
    order: 1,
  },
  AWAITING_PROVOST_ACTION: {
    label: "Needs Provost attention",
    description: "Still with the Provost Office — action needed.",
    token: "--status-awaiting-approval",
    open: true,
    order: 2,
  },
  TREATED: {
    label: "Provost has attended",
    description: "Provost Office has attended; letter still with Provost until sent to a unit.",
    token: "--status-approved",
    open: true,
    order: 3,
  },
  DISPATCHED: {
    label: "Sent to unit",
    description: "Routed to a destination unit.",
    token: "--status-dispatched",
    open: true,
    order: 4,
  },
  CLOSED: {
    label: "Closed",
    description: "Finished — no longer active.",
    token: "--status-archived",
    open: false,
    order: 5,
  },
  KIV: {
    label: "Keep in view",
    description: "Set aside for later — still open, not closed.",
    token: "--status-kiv",
    open: true,
    order: 6,
  },
};

/** All statuses shown in filters and the status picker (pipeline + KIV). */
export const CORRESPONDENCE_STATUSES: CorrespondenceStatus[] = [
  ...STATUS_FLOW,
  "KIV",
];

/** Statuses that may be chosen when first logging a letter (before routing). */
export const CREATE_STATUSES: CorrespondenceStatus[] = [
  "AWAITING_PROVOST_ACTION",
];

export const PHYSICAL_ACK_AFTER_HOURS = 24;

export const OPEN_STATUSES = CORRESPONDENCE_STATUSES.filter(
  (s) => STATUS_META[s].open,
);

export const CLOSED_STATUSES = CORRESPONDENCE_STATUSES.filter(
  (s) => !STATUS_META[s].open,
);

export function canEnterKiv(status: CorrespondenceStatus): boolean {
  return status !== "KIV" && status !== "CLOSED";
}

/** Pipeline stage used for progress when a letter is parked as KIV. */
export function progressStatus(
  status: CorrespondenceStatus,
  statusBeforeKiv?: CorrespondenceStatus | null,
): CorrespondenceStatus {
  if (status === "KIV") {
    return statusBeforeKiv && statusBeforeKiv !== "KIV"
      ? statusBeforeKiv
      : "RECEIVED";
  }
  return status;
}

export function statusIndex(status: CorrespondenceStatus): number {
  const index = STATUS_FLOW.indexOf(status);
  return index < 0 ? 0 : index;
}

export function nextStatus(
  status: CorrespondenceStatus,
): CorrespondenceStatus | null {
  if (status === "KIV") return null;
  const index = statusIndex(status);
  if (index >= STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[index + 1] ?? null;
}

/** 0–100 progress through the workflow (CLOSED = 100). */
export function statusProgressPercent(status: CorrespondenceStatus): number {
  const index = statusIndex(status);
  if (STATUS_FLOW.length <= 1) return 100;
  return Math.round((index / (STATUS_FLOW.length - 1)) * 100);
}

export const ROLE_META: Record<
  UserRole,
  { label: string; description: string }
> = {
  SUPER_ADMIN: {
    label: "Super Administrator",
    description:
      "Manage users, settings, destination offices and view audit logs.",
  },
  PROVOST_STAFF: {
    label: "Provost Staff",
    description:
      "Register, search, edit and update correspondence; generate reports.",
  },
  DEPARTMENT_STAFF: {
    label: "Unit Staff",
    description:
      "View and process correspondence the Provost Office directed to your unit.",
  },
};

export type ApplicantTypeMeta = {
  label: string;
  nameLabel: string;
  idLabel: string | null;
};

/** Mail type / correspondent category (Prisma enum still named ApplicantType). */
export const APPLICANT_TYPE_META: Record<ApplicantType, ApplicantTypeMeta> = {
  STUDENT: {
    label: "Student",
    nameLabel: "Letter writer / originator",
    idLabel: null,
  },
  STAFF: {
    label: "Staff",
    nameLabel: "Letter writer / originator",
    idLabel: "Staff ID",
  },
  UNIT: {
    label: "Unit",
    nameLabel: "Letter writer / originator",
    idLabel: null,
  },
  EXTERNAL: {
    label: "External",
    nameLabel: "Letter writer / originator",
    idLabel: null,
  },
  OTHERS: {
    label: "Others",
    nameLabel: "Letter writer / originator",
    idLabel: null,
  },
};

export const ROLE_SLUGS = Object.keys(ROLE_META) as UserRole[];

/**
 * A letter still open after this many days is treated as overdue.
 *
 * The registry has no contractual SLA, so this is a working convention agreed
 * with the Provost's office rather than a rule from a policy document. It lives
 * here so it can be changed in one place.
 */
export const OVERDUE_AFTER_DAYS = 7;

export const DEFAULT_PAGE_SIZE = 25;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
] as const;

export const SETTING_KEYS = {
  universityName: "universityName",
  pgSchoolName: "pgSchoolName",
  referencePrefix: "referencePrefix",
  scannerEnabled: "scannerEnabled",
} as const;
