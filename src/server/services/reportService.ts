import "server-only";

import type { CorrespondenceStatus } from "@prisma/client";
import ExcelJS from "exceljs";

import { STATUS_META } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export type ReportPeriod = "daily" | "weekly" | "monthly" | "yearly" | "custom";

export type ReportParams = {
  period: ReportPeriod;
  dateFrom?: Date;
  dateTo?: Date;
};

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function resolveReportRange(params: ReportParams): {
  from: Date;
  to: Date;
  label: string;
} {
  const now = new Date();
  if (params.period === "custom" && params.dateFrom && params.dateTo) {
    return {
      from: startOfDay(params.dateFrom),
      to: endOfDay(params.dateTo),
      label: `${params.dateFrom.toLocaleDateString()} – ${params.dateTo.toLocaleDateString()}`,
    };
  }

  const to = endOfDay(now);
  const from = startOfDay(now);

  switch (params.period) {
    case "weekly":
      from.setDate(from.getDate() - 6);
      return { from, to, label: "Last 7 days" };
    case "monthly":
      from.setDate(from.getDate() - 29);
      return { from, to, label: "Last 30 days" };
    case "yearly":
      from.setFullYear(from.getFullYear() - 1);
      return { from, to, label: "Last 12 months" };
    case "daily":
    default:
      return { from, to, label: "Today" };
  }
}

export const reportService = {
  async fetchRecords(params: ReportParams) {
    const { from, to, label } = resolveReportRange(params);
    const items = await prisma.correspondence.findMany({
      where: { dateReceived: { gte: from, lte: to } },
      orderBy: { dateReceived: "desc" },
      include: {
        destinationOffice: { select: { officeName: true } },
        createdBy: { select: { fullName: true } },
        handoffs: {
          where: { current: true },
          take: 1,
          select: { state: true },
        },
      },
    });

    const byStatus = items.reduce<Record<CorrespondenceStatus, number>>(
      (acc, item) => {
        acc[item.status] = (acc[item.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<CorrespondenceStatus, number>,
    );

    return { items, from, to, label, byStatus, total: items.length };
  },

  async toExcel(params: ReportParams): Promise<Buffer> {
    const report = await this.fetchRecords(params);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Correspondence Register");

    sheet.columns = [
      { header: "Reference", key: "referenceNumber", width: 18 },
      { header: "Student", key: "studentName", width: 24 },
      { header: "Matric", key: "matricNumber", width: 14 },
      { header: "Faculty", key: "faculty", width: 22 },
      { header: "Department", key: "department", width: 22 },
      { header: "Phone", key: "phoneNumber", width: 14 },
      { header: "Subject", key: "subject", width: 36 },
      { header: "Date received", key: "dateReceived", width: 14 },
      { header: "Destination", key: "destination", width: 22 },
      { header: "Status", key: "status", width: 16 },
      { header: "Physical receipt", key: "physicalReceipt", width: 18 },
      { header: "Logged by", key: "createdBy", width: 20 },
    ];

    for (const item of report.items) {
      sheet.addRow({
        referenceNumber: item.referenceNumber,
        studentName: item.studentName,
        matricNumber: item.matricNumber,
        faculty: item.faculty,
        department: item.department,
        phoneNumber: item.phoneNumber,
        subject: item.subject,
        dateReceived: item.dateReceived.toLocaleDateString(),
        destination: item.destinationOffice?.officeName ?? "",
        status: STATUS_META[item.status].label,
        physicalReceipt:
          item.handoffs[0]?.state === "RECEIVED"
            ? "Received"
            : item.handoffs[0]?.state === "NOT_RECEIVED"
              ? "Not received"
              : item.handoffs[0]?.state === "PENDING"
                ? "Awaiting"
                : "",
        createdBy: item.createdBy.fullName,
      });
    }

    sheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  },
};
