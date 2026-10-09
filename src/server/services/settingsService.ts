import "server-only";

import type { OfficeStatus } from "@prisma/client";

import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { destinationOfficeRepository } from "@/server/repositories/destinationOfficeRepository";
import {
  settingsRepository,
  type AppSettings,
} from "@/server/repositories/settingsRepository";

export const settingsService = {
  getSettings() {
    return settingsRepository.getAll();
  },

  async saveSettings(settings: Partial<AppSettings>, userId: string) {
    await settingsRepository.upsertMany(settings);
    if (settings.referencePrefix) {
      await prisma.referenceCounter.updateMany({
        data: { prefix: settings.referencePrefix },
      });
    }
    await recordAudit({
      userId,
      action: "UPDATE_SETTINGS",
      module: "settings",
    });
  },

  listOffices(activeOnly = false) {
    return destinationOfficeRepository.list(activeOnly);
  },

  async createOffice(officeName: string, userId: string) {
    const office = await destinationOfficeRepository.create({
      officeName: officeName.trim(),
      status: "ACTIVE",
    });
    await recordAudit({
      userId,
      action: "CREATE_DESTINATION_OFFICE",
      module: "settings",
    });
    return office;
  },

  async updateOffice(
    id: string,
    data: { officeName?: string; status?: OfficeStatus },
    userId: string,
  ) {
    const office = await destinationOfficeRepository.update(id, {
      ...(data.officeName ? { officeName: data.officeName.trim() } : {}),
      ...(data.status ? { status: data.status } : {}),
    });
    await recordAudit({
      userId,
      action: "UPDATE_DESTINATION_OFFICE",
      module: "settings",
    });
    return office;
  },

  async deleteOffice(id: string, userId: string) {
    const office = await destinationOfficeRepository.findById(id);
    if (!office) {
      throw new OfficeDeleteError("That unit was not found.");
    }

    const [letters, staff, incoming, outgoing, reported, sent] = await Promise.all([
      prisma.correspondence.count({ where: { destinationOfficeId: id } }),
      prisma.user.count({ where: { destinationOfficeId: id } }),
      prisma.correspondenceHandoff.count({ where: { toOfficeId: id } }),
      prisma.correspondenceHandoff.count({ where: { fromOfficeId: id } }),
      prisma.physicalOrphanReport.count({ where: { reportingOfficeId: id } }),
      prisma.physicalOrphanReport.count({ where: { sendingOfficeId: id } }),
    ]);

    if (letters + staff + incoming + outgoing + reported + sent > 0) {
      throw new OfficeDeleteError(
        "This unit still has letters or staff linked to it. Set it to Inactive instead of deleting it.",
      );
    }

    await destinationOfficeRepository.delete(id);
    await recordAudit({
      userId,
      action: "DELETE_DESTINATION_OFFICE",
      module: "settings",
      details: office.officeName,
    });
  },
};

export class OfficeDeleteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OfficeDeleteError";
  }
}
