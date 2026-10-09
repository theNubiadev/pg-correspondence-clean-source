import "server-only";

import type { CorrespondenceStatus } from "@prisma/client";

import type { CurrentUser } from "@/lib/auth/session";
import { looksLikeReference } from "@/lib/reference";
import { correspondenceService } from "@/server/services/correspondenceService";

export type SearchHit = {
  id: string;
  referenceNumber: string;
  studentName: string;
  subject: string;
  status: CorrespondenceStatus;
  dateReceived: Date;
  destinationOffice: { officeName: string } | null;
};

export async function globalSearch(
  _user: CurrentUser,
  q: string,
  limit = 8,
): Promise<SearchHit[]> {
  const trimmed = q.trim();
  if (!trimmed) return [];

  const result = await correspondenceService.search({
    q: looksLikeReference(trimmed)
      ? trimmed.toUpperCase().replace(/^(PROV|PG)\/?/, "$1/")
      : trimmed,
    pageSize: limit,
  });

  return result.items.map((item) => ({
    id: item.id,
    referenceNumber: item.referenceNumber,
    studentName: item.studentName,
    subject: item.subject,
    status: item.status,
    dateReceived: item.dateReceived,
    destinationOffice: item.destinationOffice,
  }));
}
