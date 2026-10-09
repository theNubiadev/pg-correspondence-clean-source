import { PrismaClient } from "@prisma/client";

/**
 * A single Prisma client per process.
 *
 * Next.js dev mode re-evaluates modules on every hot reload, which would
 * otherwise exhaust the Postgres connection pool. Caching on `globalThis`
 * survives the reload; in production the module is evaluated once.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export type { Prisma } from "@prisma/client";
