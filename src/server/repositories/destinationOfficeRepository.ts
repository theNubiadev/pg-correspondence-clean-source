import "server-only";

import type { OfficeStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const destinationOfficeRepository = {
  async list(activeOnly = false) {
    return prisma.destinationOffice.findMany({
      where: activeOnly ? { status: "ACTIVE" } : undefined,
      orderBy: { officeName: "asc" },
    });
  },

  async findById(id: string) {
    return prisma.destinationOffice.findUnique({ where: { id } });
  },

  async create(data: Prisma.DestinationOfficeCreateInput) {
    return prisma.destinationOffice.create({ data });
  },

  async update(id: string, data: Prisma.DestinationOfficeUpdateInput) {
    return prisma.destinationOffice.update({ where: { id }, data });
  },

  async setStatus(id: string, status: OfficeStatus) {
    return prisma.destinationOffice.update({ where: { id }, data: { status } });
  },

  async delete(id: string) {
    return prisma.destinationOffice.delete({ where: { id } });
  },
};
