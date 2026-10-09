import "server-only";

import type { CorrespondenceStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { DEFAULT_PAGE_SIZE, OPEN_STATUSES } from "@/lib/constants";
import {
  registerViewWhere,
  type RegisterViewKey,
} from "@/lib/register-views";

export type CorrespondenceSearchParams = {
  q?: string;
  status?: CorrespondenceStatus;
  view?: RegisterViewKey;
  destinationOfficeId?: string;
  faculty?: string;
  department?: string;
  pvNumber?: string;
  batchNumber?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  pageSize?: number;
  sort?:
    | "dateReceived"
    | "dateSentToOffice"
    | "referenceNumber"
    | "studentName"
    | "status"
    | "createdAt"
    | "updatedAt";
  dir?: "asc" | "desc";
};

const correspondenceInclude = {
  destinationOffice: { select: { id: true, officeName: true } },
  createdBy: { select: { id: true, fullName: true } },
  handoffs: {
    where: { current: true },
    take: 1,
    orderBy: { createdAt: "desc" as const },
    include: {
      toOffice: { select: { id: true, officeName: true } },
      fromOffice: { select: { id: true, officeName: true } },
    },
  },
  attachments: {
    orderBy: { createdAt: "desc" as const },
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      createdAt: true,
      uploadedBy: { select: { id: true, fullName: true } },
    },
  },
} as const;

function buildWhere(params: CorrespondenceSearchParams): Prisma.CorrespondenceWhereInput {
  const where: Prisma.CorrespondenceWhereInput = {};

  if (params.status) where.status = params.status;
  if (params.destinationOfficeId) {
    where.destinationOfficeId = params.destinationOfficeId;
  }
  if (params.faculty) {
    where.faculty = { contains: params.faculty };
  }
  if (params.department) {
    where.department = { contains: params.department };
  }
  if (params.pvNumber?.trim()) {
    where.pvNumber = { contains: params.pvNumber.trim() };
  }
  if (params.batchNumber?.trim()) {
    where.batchNumber = { contains: params.batchNumber.trim() };
  }
  if (params.dateFrom || params.dateTo) {
    where.dateReceived = {
      ...(params.dateFrom ? { gte: params.dateFrom } : {}),
      ...(params.dateTo ? { lte: params.dateTo } : {}),
    };
  }

  // Views can constrain the same columns as the explicit filters, so they go in
  // an AND clause rather than overwriting `status` / `dateReceived`.
  const view = registerViewWhere(params.view);
  if (Object.keys(view).length > 0) where.AND = [view];

  if (params.q?.trim()) {
    const q = params.q.trim();
    // Case-insensitive match so "ade" finds "Ade", "ADE", etc.
    const contains = { contains: q };
    where.OR = [
      { referenceNumber: contains },
      { studentName: contains },
      { onBehalfOf: contains },
      { addresseeName: contains },
      { batchNumber: contains },
      { matricNumber: contains },
      { staffId: contains },
      { faculty: contains },
      { department: contains },
      { subject: contains },
      { phoneNumber: contains },
      { destinationOffice: { officeName: { contains: q } } },
    ];
  }

  return where;
}

export const correspondenceRepository = {
  async findById(id: string) {
    return prisma.correspondence.findUnique({
      where: { id },
      include: correspondenceInclude,
    });
  },

  async findByReference(referenceNumber: string) {
    return prisma.correspondence.findUnique({
      where: { referenceNumber },
      include: correspondenceInclude,
    });
  },

  async search(params: CorrespondenceSearchParams) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * pageSize;
    const sortField = params.sort ?? "dateReceived";
    const sortDir = params.dir ?? "desc";
    const where = buildWhere(params);

    const [items, total] = await prisma.$transaction([
      prisma.correspondence.findMany({
        where,
        include: correspondenceInclude,
        orderBy: { [sortField]: sortDir },
        skip,
        take: pageSize,
      }),
      prisma.correspondence.count({ where }),
    ]);

    return { items, total, page, pageSize, pageCount: Math.ceil(total / pageSize) };
  },

  async create(data: Prisma.CorrespondenceCreateInput) {
    return prisma.correspondence.create({
      data,
      include: correspondenceInclude,
    });
  },

  async update(id: string, data: Prisma.CorrespondenceUpdateInput) {
    return prisma.correspondence.update({
      where: { id },
      data,
      include: correspondenceInclude,
    });
  },

  async delete(id: string) {
    return prisma.correspondence.delete({ where: { id } });
  },

  async count(where: Prisma.CorrespondenceWhereInput = {}) {
    return prisma.correspondence.count({ where });
  },

  async groupByStatus(where: Prisma.CorrespondenceWhereInput = {}) {
    return prisma.correspondence.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    });
  },

  async groupByDestinationOffice(where: Prisma.CorrespondenceWhereInput = {}) {
    return prisma.correspondence.groupBy({
      by: ["destinationOfficeId"],
      where,
      _count: { _all: true },
    });
  },

  async recent(take = 10, where: Prisma.CorrespondenceWhereInput = {}) {
    return prisma.correspondence.findMany({
      where,
      take,
      orderBy: { createdAt: "desc" },
      include: correspondenceInclude,
    });
  },

  async openQueue(
    take = 12,
    where: Prisma.CorrespondenceWhereInput = {},
    options: { newestAssignedFirst?: boolean } = {},
  ) {
    // KIV is open but parked — it has its own dashboard section.
    const activeOpen = OPEN_STATUSES.filter((s) => s !== "KIV");
    return prisma.correspondence.findMany({
      where: { ...where, status: { in: activeOpen } },
      take,
      orderBy: options.newestAssignedFirst
        ? [{ dateSentToOffice: "desc" }, { createdAt: "desc" }]
        : [{ dateReceived: "asc" }],
      include: correspondenceInclude,
    });
  },

  async recentlyUpdated(take = 6, where: Prisma.CorrespondenceWhereInput = {}) {
    return prisma.correspondence.findMany({
      where,
      take,
      orderBy: { updatedAt: "desc" },
      include: correspondenceInclude,
    });
  },

  async recentlySettled(take = 5, where: Prisma.CorrespondenceWhereInput = {}) {
    return prisma.correspondence.findMany({
      where: { ...where, status: { in: ["DISPATCHED", "CLOSED"] } },
      take,
      orderBy: { updatedAt: "desc" },
      include: correspondenceInclude,
    });
  },
};
