import Link from "next/link";
import { redirect } from "next/navigation";

import { PageBody, PageHeader } from "@/components/layout/page-header";
import { PrintButton } from "@/components/reports/print-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { requireReportsPage } from "@/lib/auth/guards";
import { STATUS_META } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { reportRequestSchema } from "@/lib/validations/admin";
import { getReportData } from "@/server/queries/reports";
import { resolveReportRange } from "@/server/services/reportService";
import type { CorrespondenceStatus } from "@prisma/client";

export const metadata = {
  title: "Report preview",
};

export default async function ReportPreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireReportsPage("/reports/preview");
  const params = await searchParams;

  const parsed = reportRequestSchema.safeParse(params);
  if (!parsed.success) {
    return (
      <>
        <PageHeader
          title="Report preview"
          description="The date range could not be used."
          breadcrumbs={[
            { label: "Reports", href: "/reports" },
            { label: "Preview" },
          ]}
        />
        <PageBody>
          <ErrorState
            title="Check the report dates"
            description={
              parsed.error.issues[0]?.message ??
              "Choose a valid period or a start date that is not after the end date."
            }
            action={
              <Button asChild>
                <Link href="/reports">Back to reports</Link>
              </Button>
            }
          />
        </PageBody>
      </>
    );
  }
  const request = parsed.data;

  if (request.format === "xlsx") {
    const query = new URLSearchParams();
    query.set("period", request.period);
    if (request.from) query.set("from", request.from.toISOString());
    if (request.to) query.set("to", request.to.toISOString());
    redirect(`/api/export/report?${query.toString()}`);
  }

  const report = await getReportData({
    period: request.period,
    dateFrom: request.from,
    dateTo: request.to,
  });
  const range = resolveReportRange({
    period: request.period,
    dateFrom: request.from,
    dateTo: request.to,
  });

  return (
    <>
      <PageHeader
        title="Report preview"
        description={`${range.label} — ${report.total} record(s)`}
        breadcrumbs={[
          { label: "Reports", href: "/reports" },
          { label: "Preview" },
        ]}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/reports">Back</Link>
            </Button>
            <PrintButton />
          </>
        }
      />

      <PageBody>
        <div className="surface overflow-x-auto print:border-0 print:shadow-none">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Matric</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Sent to office</TableHead>
                <TableHead>Physical receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center">
                    Nothing in this period.
                  </TableCell>
                </TableRow>
              ) : (
                report.items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.referenceNumber}</TableCell>
                    <TableCell>{row.studentName}</TableCell>
                    <TableCell className="font-mono text-xs">{row.matricNumber}</TableCell>
                    <TableCell className="max-w-xs truncate">{row.subject}</TableCell>
                    <TableCell>
                      {row.destinationOffice?.officeName ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {STATUS_META[row.status as CorrespondenceStatus].label}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(row.dateReceived)}</TableCell>
                    <TableCell>
                      {row.dateSentToOffice ? formatDate(row.dateSentToOffice) : "—"}
                    </TableCell>
                    <TableCell>
                      {row.handoffs?.[0]?.state === "RECEIVED"
                        ? "Received"
                        : row.handoffs?.[0]?.state === "NOT_RECEIVED"
                          ? "Not received"
                          : row.handoffs?.[0]?.state === "PENDING"
                            ? "Awaiting"
                            : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </PageBody>
    </>
  );
}
