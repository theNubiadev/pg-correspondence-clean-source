import { NextResponse } from "next/server";

import { requireRegisterAccess } from "@/lib/auth/guards";
import { reportRequestSchema } from "@/lib/validations/admin";
import { exportReportExcel } from "@/server/queries/reports";

export async function GET(request: Request) {
  try {
    await requireRegisterAccess();
    const { searchParams } = new URL(request.url);
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    const parsed = reportRequestSchema.safeParse(params);
    const requestParams = parsed.success
      ? parsed.data
      : reportRequestSchema.parse({ period: "monthly", format: "xlsx" });

    const buffer = await exportReportExcel({
      period: requestParams.period,
      dateFrom: requestParams.from,
      dateTo: requestParams.to,
    });

    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="pg-report-${stamp}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("[export] report failed", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
