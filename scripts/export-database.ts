/**
 * Export all database tables to JSON for handoff/backup.
 * Usage: tsx --env-file=.env scripts/export-database.ts
 */

import { PrismaClient } from "@prisma/client";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient();
const outDir = path.join(process.cwd(), "data", "export");

async function main() {
  await mkdir(outDir, { recursive: true });

  const data = {
    exportedAt: new Date().toISOString(),
    users: await prisma.user.findMany(),
    authentic: await prisma.authentic.findMany(),
    sessions: await prisma.session.findMany(),
    passwordResetTokens: await prisma.passwordResetToken.findMany(),
    destinationOffices: await prisma.destinationOffice.findMany(),
    referenceCounters: await prisma.referenceCounter.findMany(),
    correspondence: await prisma.correspondence.findMany(),
    notifications: await prisma.notification.findMany(),
    auditLogs: await prisma.auditLog.findMany(),
    settings: await prisma.setting.findMany(),
  };

  const file = path.join(outDir, "database-export.json");
  await writeFile(file, JSON.stringify(data, null, 2), "utf8");

  const counts = Object.fromEntries(
    Object.entries(data)
      .filter(([k]) => k !== "exportedAt")
      .map(([k, v]) => [k, Array.isArray(v) ? v.length : 0]),
  );

  console.log("Exported to", file);
  console.log("Row counts:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
