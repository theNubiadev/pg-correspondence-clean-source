/**
 * Verify admin user management (create + deactivate) against live MySQL.
 * Run: DATABASE_URL=... npx tsx --env-file=.env scripts/verify-admin-staff.ts
 */

import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TEST = `verify_${Date.now()}`;

async function main() {
  const admin = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN", status: "ACTIVE" },
  });
  if (!admin) throw new Error("No active super admin");

  const ictOffice = await prisma.destinationOffice.findUnique({
    where: { officeName: "ICT" },
    select: { id: true },
  });
  if (!ictOffice) throw new Error("ICT office missing — run db:seed");

  const passHash = await hash("TestUser@2026", 12);

  const user = await prisma.user.create({
    data: {
      username: TEST,
      email: `${TEST}@pgcollege.ui.edu.ng`,
      fullName: "Verify User",
      passwordHash: passHash,
      userType: "ict",
      role: "DEPARTMENT_STAFF",
      status: "ACTIVE",
      destinationOfficeId: ictOffice.id,
    },
  });

  await prisma.authentic.create({
    data: {
      username: TEST,
      pass: passHash,
      userType: "ict",
      userId: user.id,
    },
  });

  console.log("PASS: Create user ->", user.username);

  await prisma.user.update({
    where: { id: user.id },
    data: { status: "INACTIVE" },
  });

  const deactivated = await prisma.user.findUnique({ where: { id: user.id } });
  if (deactivated?.status !== "INACTIVE") throw new Error("Deactivate failed");
  console.log("PASS: Deactivate user -> INACTIVE");
  console.log("INFO: No hard delete in UI — admin uses Deactivate, not Delete");

  await prisma.authentic.deleteMany({ where: { username: TEST } });
  await prisma.user.delete({ where: { id: user.id } });
  console.log("PASS: Test user cleaned up");
}

main()
  .catch((err) => {
    console.error("FAIL:", err.message ?? err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
