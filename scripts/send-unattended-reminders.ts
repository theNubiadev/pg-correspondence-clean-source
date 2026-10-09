/**
 * Optional cron entry point for unattended unit reminders.
 *
 *   npx tsx --env-file=.env scripts/send-unattended-reminders.ts
 *
 * Unit dashboards also run an idempotent sweep on load; this script is for
 * scheduled runs (n8n / cron) when the office is quiet.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import Module from "node:module";

// Scripts run outside Next.js; stub the RSC guard so server-only modules load.
const nodeModule = Module as typeof Module & {
  _load: (request: string, parent: unknown, isMain: boolean) => unknown;
};
const originalLoad = nodeModule._load.bind(Module);
nodeModule._load = function (
  request: string,
  parent: unknown,
  isMain: boolean,
) {
  if (request === "server-only") return {};
  return originalLoad(request, parent, isMain);
};

async function main() {
  const { notificationService } = await import(
    "../src/server/services/notificationService"
  );
  const { prisma } = await import("../src/lib/prisma");

  const created = await notificationService.sweepUnattendedReminders();
  console.log(`Unattended reminders created: ${created}`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
