import "server-only";

import {
  auditRepository,
  type AuditListParams,
} from "@/server/repositories/auditRepository";

export const auditService = {
  list(params: AuditListParams = {}) {
    return auditRepository.list(params);
  },
};
