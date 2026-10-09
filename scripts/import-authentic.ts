/**
 * Import university `authentic` rows into Postgres `authentic` + linked `users`.
 *
 * Passwords are hashed (never stored plain). Unknown user_type codes are skipped.
 *
 * Extended university file (all units + original dump rows):
 *   npm run db:import-authentic
 *   npx tsx --env-file=.env scripts/import-authentic.ts --csv prisma/authentic.csv
 *
 * From local MySQL dump DB:
 *   npx tsx --env-file=.env scripts/import-authentic.ts --mysql
 */

import { readFileSync } from "node:fs";
import Module from "node:module";
import { parseArgs } from "node:util";

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

type AuthenticRow = {
  username: string;
  pass: string;
  user_type: string;
};

async function loadFromMysql(): Promise<AuthenticRow[]> {
  const { execFileSync } = await import("node:child_process");
  const out = execFileSync(
    "mysql",
    [
      "-uroot",
      "pgsui_app_admin",
      "-N",
      "-B",
      "-e",
      "SELECT username, pass, user_type FROM authentic",
    ],
    { encoding: "utf8" },
  );
  return out
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [username, pass, user_type] = line.split("\t");
      return { username, pass, user_type };
    });
}

function loadFromCsv(path: string): AuthenticRow[] {
  const text = readFileSync(path, "utf8");
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  const start = lines[0]?.toLowerCase().includes("username") ? 1 : 0;
  return lines.slice(start).map((line) => {
    const [username, pass, user_type] = line.split(/,|\t/).map((c) => c.trim());
    return { username, pass, user_type };
  });
}

async function main() {
  const { values } = parseArgs({
    options: {
      mysql: { type: "boolean", default: false },
      csv: { type: "string" },
      dryRun: { type: "boolean", default: false },
    },
  });

  const { hashPassword } = await import("../src/lib/auth/password");
  const {
    resolveUniversityType,
    normalizeUniversityType,
  } = await import("../src/lib/auth/university-types");
  const { upsertAuthenticAndProvision } = await import(
    "../src/lib/auth/provision-from-authentic"
  );
  const { prisma } = await import("../src/lib/prisma");

  const rows = values.csv
    ? loadFromCsv(values.csv)
    : values.mysql
      ? await loadFromMysql()
      : (() => {
          throw new Error("Pass --mysql or --csv <file>");
        })();

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const username = row.username?.trim().toLowerCase();
    const pass = row.pass ?? "";
    const userType = normalizeUniversityType(row.user_type ?? "");
    const mapped = resolveUniversityType(userType);

    if (!username || !pass || !mapped) {
      console.warn(
        `Skip: username=${row.username} user_type=${row.user_type} (unknown or incomplete)`,
      );
      skipped += 1;
      continue;
    }

    if (values.dryRun) {
      console.log(
        `[dry-run] ${username} → ${mapped.role} / ${mapped.officeName ?? "counter"} (${userType})`,
      );
      imported += 1;
      continue;
    }

    try {
      const { authentic, user } = await upsertAuthenticAndProvision({
        username,
        passHash: await hashPassword(pass),
        userType,
        mustChangePassword: true,
      });
      imported += 1;
      console.log(
        `Upserted authentic#${authentic.id} ${username} → user ${user.id} (${mapped.role}${mapped.officeName ? ` @ ${mapped.officeName}` : ""})`,
      );
    } catch (error) {
      console.warn(
        `Skip ${username}:`,
        error instanceof Error ? error.message : error,
      );
      skipped += 1;
    }
  }

  console.log(`\nDone. imported=${imported} skipped=${skipped}`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  try {
    const { prisma } = await import("../src/lib/prisma");
    await prisma.$disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
