import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";

export type AuditListParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  action?: string;
  module?: string;
};

export const auditRepository = {
  async list(params: AuditListParams = {}) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * pageSize;
    const where: Prisma.AuditLogWhereInput = {};

    if (params.action) where.action = { contains: params.action };
    if (params.module) where.module = { contains: params.module };
    if (params.q?.trim()) {
      const q = params.q.trim();
      where.OR = [
        { action: { contains: q } },
        { module: { contains: q } },
        { details: { contains: q } },
        { user: { fullName: { contains: q } } },
      ];
    }

    const [items, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        include: {
          user: { select: { id: true, fullName: true, email: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, pageSize, pageCount: Math.ceil(total / pageSize) };
  },

  async create(data: {
    userId?: string | null;
    action: string;
    module: string;
    details?: string | null;
  }) {
    return prisma.auditLog.create({ data });
  },
};
