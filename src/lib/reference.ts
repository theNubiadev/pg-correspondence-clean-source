import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type AllocatedReference = { sequence: number; reference: string };

export const DEFAULT_REFERENCE_PREFIX = "PROV";

/**
 * Allocates the next register reference, e.g. `PROV/2026/000001`.
 *
 * The allocation happens inside MySQL using an atomic
 * `INSERT ... ON DUPLICATE KEY UPDATE` that takes a row lock on the year's
 * counter, so two registry officers pressing Save in the same millisecond
 * queue behind each other and can never be handed the same number.
 * `reference_number` also carries a UNIQUE constraint as a last line of
 * defence.
 *
 * Call this inside the same transaction as the insert so an aborted save does
 * not silently burn a number.
 */
export async function allocateReference(
  tx: Prisma.TransactionClient | typeof prisma = prisma,
  year: number = new Date().getFullYear(),
): Promise<AllocatedReference> {
  // MySQL: atomically increment (or seed) the counter for this year.
  // `year` is a MySQL reserved keyword so it must be backtick-quoted.
  await tx.$executeRaw(
    Prisma.sql`INSERT INTO reference_counters (\`year\`, \`last_value\`, \`prefix\`, \`updated_at\`)
      VALUES (${year}, 1, 'PROV', NOW())
      ON DUPLICATE KEY UPDATE \`last_value\` = \`last_value\` + 1, \`updated_at\` = NOW()`,
  );

  // MySQL: read the counter back and format the reference in the app layer.
  const rows = await tx.$queryRaw<
    { sequence: number; reference: string }[]
  >(
    Prisma.sql`SELECT \`last_value\` AS \`sequence\`,
           CONCAT(\`prefix\`, '/', ${year}, '/', LPAD(CAST(\`last_value\` AS CHAR), 6, '0')) AS \`reference\`
    FROM reference_counters
    WHERE \`year\` = ${year}`,
  );

  const row = rows[0];
  if (!row) {
    throw new Error(
      "Could not allocate a reference number. Has the search/integrity migration been applied?",
    );
  }

  return { sequence: Number(row.sequence), reference: row.reference };
}

/** Formats a sequence the same way the database function does. */
export function formatReference(
  sequence: number,
  year: number,
  prefix = DEFAULT_REFERENCE_PREFIX,
): string {
  return `${prefix}/${year}/${String(sequence).padStart(6, "0")}`;
}

const REFERENCE_PATTERN = /^([A-Z]{2,6})\/(\d{4})\/(\d{6})$/;

export function parseReference(
  value: string,
): { prefix: string; year: number; sequence: number } | null {
  const match = REFERENCE_PATTERN.exec(value.trim().toUpperCase());
  if (!match) return null;
  return {
    prefix: match[1],
    year: Number.parseInt(match[2], 10),
    sequence: Number.parseInt(match[3], 10),
  };
}

/**
 * True when the input looks like someone typing a reference number, so global
 * search can jump straight to the record instead of running a text search.
 */
export function looksLikeReference(value: string): boolean {
  return /^(prov\/?|pg\/?|[a-z]{2,6}\/)?\s*\d{2,4}(\/\d{1,6})?$/i.test(
    value.trim(),
  );
}
