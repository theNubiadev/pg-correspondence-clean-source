import type { UserRole } from "@prisma/client";

/**
 * Maps university `authentic.user_type` codes onto our roles and PG units.
 * Codes are matched case-insensitively.
 *
 * The university dump uses columns: username, pass, user_type.
 * Extend that file (see prisma/authentic.csv) — do not invent a different auth schema.
 */
export type UniversityTypeMapping = {
  code: string;
  role: UserRole;
  /** Destination office name; null = Provost Office counter (no unit binding). */
  officeName: string | null;
  label: string;
};

/**
 * Canonical PG School destination units (letters are routed here).
 * Keep in sync with OFFICE_TO_USER_TYPE / authentic.user_type codes.
 */
export const CANONICAL_PG_UNITS = [
  "Provost",
  "Deputy Provost Academic",
  "Deputy Provost Admin",
  "ICT",
  "Admission",
  "Records",
  "Store",
  "Finance",
  "Bursary",
  "Registry",
  "Committee",
  "Exams unit",
  "Audit unit",
  "Deputy Registrar (Admin)",
  "Deputy Registrar (Exams and Records)",
] as const;

export type CanonicalPgUnit = (typeof CANONICAL_PG_UNITS)[number];

const MAPPINGS: UniversityTypeMapping[] = [
  {
    code: "admin",
    role: "SUPER_ADMIN",
    officeName: null,
    label: "System administrator",
  },
  {
    code: "prov",
    role: "PROVOST_STAFF",
    officeName: null,
    label: "Provost Office",
  },
  {
    code: "provost",
    role: "PROVOST_STAFF",
    officeName: null,
    label: "Provost Office",
  },
  {
    code: "rec",
    role: "DEPARTMENT_STAFF",
    officeName: "Records",
    label: "Records",
  },
  {
    code: "records",
    role: "DEPARTMENT_STAFF",
    officeName: "Records",
    label: "Records",
  },
  {
    code: "fin",
    role: "DEPARTMENT_STAFF",
    officeName: "Finance",
    label: "Finance",
  },
  {
    code: "finance",
    role: "DEPARTMENT_STAFF",
    officeName: "Finance",
    label: "Finance",
  },
  {
    code: "bur",
    role: "DEPARTMENT_STAFF",
    officeName: "Bursary",
    label: "Bursary",
  },
  {
    code: "bursary",
    role: "DEPARTMENT_STAFF",
    officeName: "Bursary",
    label: "Bursary",
  },
  {
    code: "ict",
    role: "DEPARTMENT_STAFF",
    officeName: "ICT",
    label: "ICT",
  },
  {
    code: "adm",
    role: "DEPARTMENT_STAFF",
    officeName: "Admission",
    label: "Admission",
  },
  {
    code: "admission",
    role: "DEPARTMENT_STAFF",
    officeName: "Admission",
    label: "Admission",
  },
  {
    code: "admissions",
    role: "DEPARTMENT_STAFF",
    officeName: "Admission",
    label: "Admission",
  },
  {
    code: "reg",
    role: "DEPARTMENT_STAFF",
    officeName: "Registry",
    label: "Registry",
  },
  {
    code: "registry",
    role: "DEPARTMENT_STAFF",
    officeName: "Registry",
    label: "Registry",
  },
  {
    code: "store",
    role: "DEPARTMENT_STAFF",
    officeName: "Store",
    label: "Store",
  },
  {
    code: "dpa",
    role: "DEPARTMENT_STAFF",
    officeName: "Deputy Provost Academic",
    label: "Deputy Provost Academic",
  },
  {
    code: "deputy_academic",
    role: "DEPARTMENT_STAFF",
    officeName: "Deputy Provost Academic",
    label: "Deputy Provost Academic",
  },
  {
    code: "dpad",
    role: "DEPARTMENT_STAFF",
    officeName: "Deputy Provost Admin",
    label: "Deputy Provost Admin",
  },
  {
    code: "deputy_admin",
    role: "DEPARTMENT_STAFF",
    officeName: "Deputy Provost Admin",
    label: "Deputy Provost Admin",
  },
  /** Letters directed to the Provost destination unit (not the logging counter). */
  {
    code: "prov_unit",
    role: "DEPARTMENT_STAFF",
    officeName: "Provost",
    label: "Provost unit desk",
  },
  {
    code: "committee",
    role: "DEPARTMENT_STAFF",
    officeName: "Committee",
    label: "Committee",
  },
  {
    code: "comm",
    role: "DEPARTMENT_STAFF",
    officeName: "Committee",
    label: "Committee",
  },
  {
    code: "exams",
    role: "DEPARTMENT_STAFF",
    officeName: "Exams unit",
    label: "Exams unit",
  },
  {
    code: "exam",
    role: "DEPARTMENT_STAFF",
    officeName: "Exams unit",
    label: "Exams unit",
  },
  {
    code: "audit",
    role: "DEPARTMENT_STAFF",
    officeName: "Audit unit",
    label: "Audit unit",
  },
  {
    code: "dra",
    role: "DEPARTMENT_STAFF",
    officeName: "Deputy Registrar (Admin)",
    label: "Deputy Registrar (Admin)",
  },
  {
    code: "dr_admin",
    role: "DEPARTMENT_STAFF",
    officeName: "Deputy Registrar (Admin)",
    label: "Deputy Registrar (Admin)",
  },
  {
    code: "drer",
    role: "DEPARTMENT_STAFF",
    officeName: "Deputy Registrar (Exams and Records)",
    label: "Deputy Registrar (Exams and Records)",
  },
  {
    code: "dr_exams",
    role: "DEPARTMENT_STAFF",
    officeName: "Deputy Registrar (Exams and Records)",
    label: "Deputy Registrar (Exams and Records)",
  },
];

const BY_CODE = new Map(
  MAPPINGS.map((row) => [row.code.toLowerCase(), row] as const),
);

/** Canonical codes shown in admin UI (one per unit/role, prefer short forms). */
export const UNIVERSITY_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "admin", label: "admin — System administrator" },
  { value: "prov", label: "prov — Provost Office (log letters)" },
  { value: "rec", label: "rec — Records" },
  { value: "fin", label: "fin — Finance" },
  { value: "bur", label: "bur — Bursary" },
  { value: "ict", label: "ict — ICT" },
  { value: "adm", label: "adm — Admission" },
  { value: "reg", label: "reg — Registry" },
  { value: "store", label: "store — Store" },
  { value: "dpa", label: "dpa — Deputy Provost Academic" },
  { value: "dpad", label: "dpad — Deputy Provost Admin" },
  { value: "prov_unit", label: "prov_unit — Provost unit desk" },
  { value: "committee", label: "committee — Committee" },
  { value: "exams", label: "exams — Exams unit" },
  { value: "audit", label: "audit — Audit unit" },
  { value: "dra", label: "dra — Deputy Registrar (Admin)" },
  { value: "drer", label: "drer — Deputy Registrar (Exams and Records)" },
];

/** Short university code for each seeded PG unit. */
export const OFFICE_TO_USER_TYPE: Record<CanonicalPgUnit, string> = {
  Provost: "prov_unit",
  "Deputy Provost Academic": "dpa",
  "Deputy Provost Admin": "dpad",
  ICT: "ict",
  Admission: "adm",
  Records: "rec",
  Store: "store",
  Finance: "fin",
  Bursary: "bur",
  Registry: "reg",
  Committee: "committee",
  "Exams unit": "exams",
  "Audit unit": "audit",
  "Deputy Registrar (Admin)": "dra",
  "Deputy Registrar (Exams and Records)": "drer",
};

/**
 * Suggested usernames for unit authentic rows (university-style).
 * Provost Office counter logins are separate (`provost` / `staff` with type `prov`).
 */
export const OFFICE_TO_USERNAME: Record<CanonicalPgUnit, string> = {
  Provost: "provost_unit",
  "Deputy Provost Academic": "dpa",
  "Deputy Provost Admin": "dpad",
  ICT: "ict",
  Admission: "admission",
  Records: "records",
  Store: "store",
  Finance: "finance",
  Bursary: "bursary",
  Registry: "registry",
  Committee: "committee",
  "Exams unit": "exams",
  "Audit unit": "audit",
  "Deputy Registrar (Admin)": "dra",
  "Deputy Registrar (Exams and Records)": "drer",
};

export function normalizeUniversityType(code: string): string {
  return code.trim().toLowerCase();
}

export function resolveUniversityType(
  code: string | null | undefined,
): UniversityTypeMapping | null {
  if (!code?.trim()) return null;
  return BY_CODE.get(normalizeUniversityType(code)) ?? null;
}

export function isKnownUniversityType(code: string): boolean {
  return resolveUniversityType(code) !== null;
}

/** Synthetic email for username-only university accounts. */
export function syntheticEmailForUsername(username: string): string {
  const safe = username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, ".")
    .replace(/^\.|\.$/g, "");
  return `${safe || "user"}@pgcollege.ui.edu.ng`;
}
