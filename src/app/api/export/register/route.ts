import { format } from "date-fns";
import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

import type { CorrespondenceStatus } from "@prisma/client";
import { recordAudit } from "@/lib/audit";
import { requireRegisterAccess } from "@/lib/auth/guards";
import { STATUS_META } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { parseRegisterFilters } from "@/lib/validations/correspondence";
import { correspondenceService } from "@/server/services/correspondenceService";

const EXPORT_LIMIT = 10_000;

export async function GET(request: Request) {
  try {
    const user = await requireRegisterAccess();
    const { searchParams } = new URL(request.url);

    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    const filters = parseRegisterFilters(params);
    const formatParam = searchParams.get("format") ?? "xlsx";

    const result = await correspondenceService.search({
      q: filters.q,
      status: filters.status as CorrespondenceStatus | undefined,
      view: filters.view,
      destinationOfficeId: filters.destinationOfficeId,
      faculty: filters.faculty,
      department: filters.department,
      pvNumber: filters.pvNumber,
      dateFrom: filters.from,
      dateTo: filters.to,
      page: 1,
      pageSize: EXPORT_LIMIT,
      sort: filters.sort,
      dir: filters.dir,
    });

    const stamp = format(new Date(), "yyyy-MM-dd");
    const filenameBase = `pg-register-${stamp}`;

    await recordAudit({
      userId: user.id,
      action: "EXPORT",
      module: "correspondence",
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Register");
    sheet.addRow([
      "Reference",
      "Mail type",
      "Letter writer / originator",
      "On behalf of / bearer",
      "Addressed to",
      "Batch number",
      "Staff ID",
      "Finance PV number",
      "Faculty",
      "Department",
      "Phone",
      "Subject",
      "Destination",
      "Status",
      "Date received",
      "Date sent to office",
      "Physical receipt",
      "Logged by",
    ]);

    for (const row of result.items) {
      sheet.addRow([
        row.referenceNumber,
        row.applicantType,
        row.studentName,
        row.onBehalfOf ?? "",
        row.addresseeName ?? "",
        row.batchNumber ?? "",
        row.applicantType === "STAFF" ? (row.staffId ?? "") : "",
        row.pvNumber ?? "",
        row.faculty,
        row.department,
        row.phoneNumber,
        row.subject,
        row.destinationOffice?.officeName ?? "",
        STATUS_META[row.status].label,
        formatDate(row.dateReceived),
        row.dateSentToOffice ? formatDate(row.dateSentToOffice) : "",
        row.handoffs?.[0]?.state === "RECEIVED"
          ? "Received"
          : row.handoffs?.[0]?.state === "NOT_RECEIVED"
            ? "Not received"
            : row.handoffs?.[0]?.state === "PENDING"
              ? "Waiting for physical copy"
              : "",
        row.createdBy.fullName,
      ]);
    }

    sheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filenameBase}.xlsx"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ForbiddenError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof Error && error.name === "UnauthenticatedError") {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    console.error("[export] register export failed", error);
    return NextResponse.json({ error: "Could not generate the export." }, { status: 500 });
  }
}
