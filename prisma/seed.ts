/**
 * Seeds the PG Correspondence Register.
 *
 *   npm run db:seed
 */

import {
  CorrespondenceStatus,
  PrismaClient,
  UserRole,
} from "@prisma/client";
import { hash } from "bcryptjs";

import {
  CANONICAL_PG_UNITS,
  OFFICE_TO_USER_TYPE,
  OFFICE_TO_USERNAME,
} from "../src/lib/auth/university-types";
import { SETTING_KEYS } from "../src/lib/constants";

const prisma = new PrismaClient();

/** Canonical PG School units — only these stay ACTIVE. */
const PG_UNITS = CANONICAL_PG_UNITS;

const FACULTIES = [
  "Faculty of Arts",
  "Faculty of Science",
  "Faculty of Clinical Sciences",
  "Faculty of Education",
  "Faculty of Law",
];

const DEPARTMENTS = [
  "Department of English",
  "Department of Chemistry",
  "Department of Economics",
  "Department of Computer Science",
  "Department of Public Health",
];

const SUBJECTS = [
  "Application for change of programme",
  "Request for official transcript",
  "Application for extension of study",
  "Request for letter of introduction",
  "Complaint on delayed release of results",
  "Application for final clearance",
  "Request for refund of overpaid fees",
  "Submission of corrected dissertation",
];

const FIRST = [
  "Oluwaseun",
  "Chiamaka",
  "Abubakar",
  "Temitope",
  "Ifeoma",
  "Damilola",
  "Zainab",
];
const LAST = [
  "Adeyinka",
  "Okafor",
  "Bello",
  "Ogundipe",
  "Nwachukwu",
  "Lawal",
  "Ajayi",
];

let seedState = 20260728;
function random(): number {
  seedState = (seedState * 1103515245 + 12345) & 0x7fffffff;
  return seedState / 0x7fffffff;
}
function pick<T>(items: readonly T[]): T {
  return items[Math.floor(random() * items.length)];
}
function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(9 + Math.floor(random() * 8), 0, 0, 0);
  return date;
}

function slugEmail(officeName: string): string {
  return `${officeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "")}@pgcollege.ui.edu.ng`;
}

function slugUsername(officeName: string): string {
  return officeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 32);
}

async function seedSettings() {
  const settings: [string, string][] = [
    [SETTING_KEYS.universityName, "University of Ibadan"],
    [SETTING_KEYS.pgSchoolName, "The Postgraduate College"],
    [SETTING_KEYS.referencePrefix, "PROV"],
  ];

  for (const [key, value] of settings) {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
  console.log(`  settings: ${settings.length}`);
}

async function seedOffices() {
  for (const officeName of PG_UNITS) {
    await prisma.destinationOffice.upsert({
      where: { officeName },
      update: { status: "ACTIVE" },
      create: { officeName, status: "ACTIVE" },
    });
  }

  // Keep obsolete offices for historical correspondence, but hide them from routing.
  const inactivated = await prisma.destinationOffice.updateMany({
    where: { officeName: { notIn: [...PG_UNITS] } },
    data: { status: "INACTIVE" },
  });

  console.log(
    `  destination offices: ${PG_UNITS.length} active, ${inactivated.count} inactivated`,
  );
}

async function seedUsers() {
  const adminEmail =
    process.env.SEED_SUPER_ADMIN_EMAIL?.toLowerCase() ??
    "admin@pgcollege.ui.edu.ng";
  const adminPassword =
    process.env.SEED_SUPER_ADMIN_PASSWORD ?? "ChangeMe!2026";
  // Counter login — Provost Office logs every new letter (not a destination unit).
  const provostEmail =
    process.env.SEED_PROVOST_EMAIL?.toLowerCase() ??
    "provost@pgcollege.ui.edu.ng";
  const staffEmail =
    process.env.SEED_STAFF_EMAIL?.toLowerCase() ?? "staff@pgcollege.ui.edu.ng";
  const staffPassword = process.env.SEED_STAFF_PASSWORD ?? "Staff@2026";
  const deptPassword = process.env.SEED_DEPT_PASSWORD ?? "Dept@2026";

  // Upsert by username so re-seeds survive when SEED_*_EMAIL differs from an
  // existing login that already owns that username.
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      fullName: "Registry Administrator",
      email: adminEmail,
      userType: "admin",
      role: UserRole.SUPER_ADMIN,
      status: "ACTIVE",
      passwordHash: await hash(adminPassword, 12),
      destinationOfficeId: null,
    },
    create: {
      fullName: "Registry Administrator",
      username: "admin",
      email: adminEmail,
      userType: "admin",
      passwordHash: await hash(adminPassword, 12),
      role: UserRole.SUPER_ADMIN,
      status: "ACTIVE",
    },
  });

  const provostHash = await hash(staffPassword, 12);
  for (const account of [
    {
      email: provostEmail,
      username: "provost",
      fullName: "Provost Office",
      userType: "prov",
    },
    {
      email: staffEmail,
      username: "staff",
      fullName: "Provost Office Staff",
      userType: "prov",
    },
  ]) {
    await prisma.user.upsert({
      where: { username: account.username },
      update: {
        fullName: account.fullName,
        email: account.email,
        userType: account.userType,
        role: UserRole.PROVOST_STAFF,
        status: "ACTIVE",
        passwordHash: provostHash,
        destinationOfficeId: null,
      },
      create: {
        fullName: account.fullName,
        username: account.username,
        email: account.email,
        userType: account.userType,
        passwordHash: provostHash,
        role: UserRole.PROVOST_STAFF,
        status: "ACTIVE",
      },
    });
  }

  const deptHash = await hash(deptPassword, 12);
  const unitEmails: string[] = [];

  for (const officeName of PG_UNITS) {
    const office = await prisma.destinationOffice.findUnique({
      where: { officeName },
      select: { id: true },
    });
    if (!office) continue;

    const userType = OFFICE_TO_USER_TYPE[officeName] ?? slugUsername(officeName);

    // Avoid colliding with the Provost Office counter login (provost@…).
    const email =
      officeName === "Provost"
        ? "provost.unit@pgcollege.ui.edu.ng"
        : slugEmail(officeName);
    const username = OFFICE_TO_USERNAME[officeName] ?? slugUsername(officeName);
    unitEmails.push(email);

    await prisma.user.upsert({
      where: { email },
      update: {
        fullName: `${officeName} Officer`,
        username,
        userType,
        role: UserRole.DEPARTMENT_STAFF,
        status: "ACTIVE",
        destinationOfficeId: office.id,
        passwordHash: deptHash,
      },
      create: {
        fullName: `${officeName} Officer`,
        username,
        email,
        userType,
        passwordHash: deptHash,
        role: UserRole.DEPARTMENT_STAFF,
        status: "ACTIVE",
        destinationOfficeId: office.id,
      },
    });
  }

  // Retire legacy unit logins that pointed at obsolete office names.
  const retired = await prisma.user.updateMany({
    where: {
      role: UserRole.DEPARTMENT_STAFF,
      OR: [
        { destinationOffice: { status: "INACTIVE" } },
        {
          email: {
            in: [
              "admissions@pgcollege.ui.edu.ng",
              // Was wrongly seeded as unit staff; now the Provost Office counter.
              slugEmail("Provost"),
            ],
          },
        },
      ],
      NOT: { email: { in: unitEmails } },
    },
    data: { status: "INACTIVE" },
  });

  // Mirror seeded accounts into university authentic (credentials source of truth).
  const seeded = await prisma.user.findMany({
    where: { userType: { not: null }, status: "ACTIVE" },
    select: {
      id: true,
      username: true,
      passwordHash: true,
      userType: true,
    },
  });
  let authenticCount = 0;
  for (const row of seeded) {
    if (!row.userType) continue;
    await prisma.authentic.upsert({
      where: { username: row.username.slice(0, 100) },
      update: {
        pass: row.passwordHash,
        userType: row.userType.slice(0, 50),
        userId: row.id,
      },
      create: {
        username: row.username.slice(0, 100),
        pass: row.passwordHash,
        userType: row.userType.slice(0, 50),
        userId: row.id,
      },
    });
    authenticCount += 1;
  }

  console.log(
    `  users: admin + 2 Provost Office + ${PG_UNITS.length} units` +
      (retired.count ? `, ${retired.count} legacy accounts inactivated` : "") +
      `; authentic: ${authenticCount}`,
  );
}

async function seedCorrespondence(count = 30) {
  const existing = await prisma.correspondence.count();
  if (existing > 0) {
    console.log(`  correspondence: skipped (${existing} already present)`);
    return;
  }

  const staff = await prisma.user.findFirst({
    where: { role: UserRole.PROVOST_STAFF },
    select: { id: true },
  });
  const offices = await prisma.destinationOffice.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
  });
  if (!staff || !offices.length) return;

  const year = new Date().getFullYear();
  const statuses: CorrespondenceStatus[] = [
    "RECEIVED",
    "AWAITING_PROVOST_ACTION",
    "TREATED",
    "DISPATCHED",
    "CLOSED",
    "KIV",
  ];

  for (let sequence = 1; sequence <= count; sequence += 1) {
    const reference = `PROV/${year}/${String(sequence).padStart(6, "0")}`;
    const studentName = `${pick(FIRST)} ${pick(LAST)}`;
    const status = pick(statuses);
    const routed = status === "DISPATCHED" || status === "CLOSED";
    const statusBeforeKiv =
      status === "KIV"
        ? pick([
            "RECEIVED",
            "AWAITING_PROVOST_ACTION",
            "TREATED",
          ] as const)
        : null;

    await prisma.correspondence.create({
      data: {
        referenceNumber: reference,
        sequence,
        year,
        applicantType: "STUDENT",
        studentName,
        matricNumber: `${190000 + Math.floor(random() * 60000)}`,
        staffId: null,
        faculty: pick(FACULTIES),
        department: pick(DEPARTMENTS),
        phoneNumber: `080${Math.floor(10000000 + random() * 89999999)}`,
        subject: pick(SUBJECTS),
        dateReceived: daysAgo(Math.floor(random() * 120)),
        dateSentToOffice: routed ? daysAgo(Math.floor(random() * 30)) : null,
        dateClosed: status === "CLOSED" ? daysAgo(Math.floor(random() * 10)) : null,
        destinationOfficeId: routed ? pick(offices).id : null,
        status,
        statusBeforeKiv,
        createdById: staff.id,
      },
    });
  }

  await prisma.referenceCounter.upsert({
    where: { year },
    update: { lastValue: count },
    create: { year, lastValue: count, prefix: "PROV" },
  });

  console.log(`  correspondence: ${count}`);
}

async function main() {
  console.log("\nSeeding PG Correspondence Register\n");
  await seedSettings();
  await seedOffices();
  await seedUsers();
  await seedCorrespondence();

  const deptPassword = process.env.SEED_DEPT_PASSWORD ?? "Dept@2026";
  console.log("\nDone. Sign in with:");
  console.log(
    `  Super Admin: ${process.env.SEED_SUPER_ADMIN_EMAIL ?? "admin@pgcollege.ui.edu.ng"} / ${process.env.SEED_SUPER_ADMIN_PASSWORD ?? "ChangeMe!2026"}`,
  );
  console.log(
    `  Provost Office (log letters): username "provost" / ${process.env.SEED_STAFF_PASSWORD ?? "Staff@2026"}`,
  );
  console.log(
    `  Provost Office (alt): username "staff" / ${process.env.SEED_STAFF_PASSWORD ?? "Staff@2026"}`,
  );
  console.log(
    `  Unit staff: username finance|records|ict|admission|… / ${deptPassword}`,
  );
  console.log("  (Email login still works for seeded accounts.)\n");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
