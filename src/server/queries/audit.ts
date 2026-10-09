import "server-only";

import { auditService } from "@/server/services/auditService";

export async function getAuditLogs(
  page = 1,
  filters: { q?: string; action?: string; module?: string } = {},
) {
  return auditService.list({ page, ...filters });
}
