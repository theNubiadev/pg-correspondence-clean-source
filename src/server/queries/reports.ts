import "server-only";

import { reportService, type ReportParams } from "@/server/services/reportService";

export async function getReportData(params: ReportParams) {
  return reportService.fetchRecords(params);
}

export async function exportReportExcel(params: ReportParams) {
  return reportService.toExcel(params);
}
