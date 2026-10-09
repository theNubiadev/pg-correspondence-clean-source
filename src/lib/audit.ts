import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type AuditInput = {
  userId?: string | null;
  action: string;
  module: string;
  details?: string | null;
  /** Pass a transaction client to make the log atomic with the change. */
  tx?: Prisma.TransactionClient;
};

/**
 * Append a row to the permanent audit log.
 *
 * Kept deliberately small: who, what, which module, when. Richer before/after
 * payloads belong in a different system if the university ever needs them.
 */
export async function recordAudit(input: AuditInput): Promise<void> {
  const client = input.tx ?? prisma;
  const data = {
    action: input.action,
    module: input.module,
    ...(input.userId ? { user: { connect: { id: input.userId } } } : {}),
  };

  try {
    await client.auditLog.create({
      data: {
        ...data,
        // Only send when present. The runtime Prisma engine can lag the
        // schema after `details` was added; a null field still trips it.
        ...(input.details != null ? { details: input.details } : {}),
      },
    });
  } catch (error) {
    if (input.details == null) throw error;
    await client.auditLog.create({ data });
  }
}
