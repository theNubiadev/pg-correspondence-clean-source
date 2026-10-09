import type { Metadata } from "next";

import { PageBody, PageHeader } from "@/components/layout/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { ReportForm } from "@/components/reports/report-form";
import { requireReportsPage } from "@/lib/auth/guards";
import { roleLabel } from "@/lib/auth/permissions";

export const metadata: Metadata = {
  title: "Reports",
};

export default async function ReportsPage() {
  const user = await requireReportsPage("/reports");

  return (
    <>
      <PageHeader
        title="Reports"
        description="Generate register extracts using the same status and date language as the register."
        breadcrumbs={[
          { label: "Overview", href: "/dashboard" },
          { label: "Reports" },
        ]}
      />

      <PageBody>
        <SectionCard title="Generate report">
          <ReportForm
            scope={`Report scope: college register as ${roleLabel(user.role)}.`}
          />
        </SectionCard>
      </PageBody>
    </>
  );
}
