/**
 * Compare correspondence and event counts after
 * 20260901120000_correspondence_events.
 *
 * Run against a disposable copy, never the only live database:
 *   npx tsx --env-file=.env scripts/verify-migration.ts
 */
import { prisma } from "../src/lib/prisma";

async function main() {
  const [letters, events, imported, users, sessions] = await Promise.all([
    prisma.correspondence.count(),
    prisma.correspondenceEvent.count(),
    prisma.correspondenceEvent.count({ where: { type: "IMPORTED" } }),
    prisma.user.count(),
    prisma.session.count(),
  ]);

  const missingEvents = await prisma.correspondence.count({
    where: { events: { none: {} } },
  });

  console.log({
    letters,
    events,
    imported,
    users,
    sessions,
    lettersWithoutEvents: missingEvents,
  });

  if (missingEvents > 0) {
    throw new Error(
      `${missingEvents} correspondence row(s) have no movement event. Re-run the backfill.`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
