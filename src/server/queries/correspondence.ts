import "server-only";

import { cache } from "react";

import type { CorrespondenceStatus } from "@prisma/client";
import type { CurrentUser } from "@/lib/auth/session";
import { correspondenceService } from "@/server/services/correspondenceService";
import { parseRegisterFilters } from "@/lib/validations/correspondence";
import { destinationOfficeRepository } from "@/server/repositories/destinationOfficeRepository";

export async function getRegister(
  params: Record<string, string | string[] | undefined>,
  _user: CurrentUser,
) {
  const filters = parseRegisterFilters(params);

  return correspondenceService.search({
    q: filters.q,
    status: filters.status as CorrespondenceStatus | undefined,
    view: filters.view,
    destinationOfficeId: filters.destinationOfficeId,
    faculty: filters.faculty,
    department: filters.department,
    pvNumber: filters.pvNumber,
    batchNumber: filters.batchNumber,
    dateFrom: filters.from,
    dateTo: filters.to,
    page: filters.page,
    pageSize: filters.perPage,
    sort: filters.sort,
    dir: filters.dir,
  });
}

export const getFilterOptions = cache(async () => {
  const offices = await destinationOfficeRepository.list(true);
  return { offices };
});

export async function getCorrespondenceDetail(id: string, _user: CurrentUser) {
  return correspondenceService.getById(id);
}

export async function getCorrespondenceEvents(id: string) {
  return correspondenceService.listEvents(id);
}
