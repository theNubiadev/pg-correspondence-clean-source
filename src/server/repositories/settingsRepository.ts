import "server-only";

import { prisma } from "@/lib/prisma";
import { ORG_NAME, ORG_SHORT_NAME, SETTING_KEYS } from "@/lib/constants";

export type AppSettings = {
  universityName: string;
  pgSchoolName: string;
  referencePrefix: string;
};

const DEFAULTS: AppSettings = {
  universityName: "University of Ibadan",
  pgSchoolName: ORG_SHORT_NAME,
  referencePrefix: "PROV",
};

export const settingsRepository = {
  async getAll(): Promise<AppSettings> {
    const rows = await prisma.setting.findMany();
    const map = new Map(rows.map((r) => [r.key, r.value]));
    return {
      universityName: map.get(SETTING_KEYS.universityName) ?? DEFAULTS.universityName,
      pgSchoolName: map.get(SETTING_KEYS.pgSchoolName) ?? DEFAULTS.pgSchoolName,
      referencePrefix: map.get(SETTING_KEYS.referencePrefix) ?? DEFAULTS.referencePrefix,
    };
  },

  async upsert(key: string, value: string) {
    return prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  },

  async upsertMany(settings: Partial<AppSettings>) {
    const entries = Object.entries(settings).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === "string" && entry[1] !== undefined,
    );
    await prisma.$transaction(
      entries.map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        }),
      ),
    );
  },
};

export function orgDisplayName(settings: AppSettings): string {
  return settings.pgSchoolName || ORG_NAME;
}
