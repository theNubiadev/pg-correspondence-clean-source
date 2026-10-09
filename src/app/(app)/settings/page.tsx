import type { Metadata } from "next";
import Link from "next/link";

import { DestinationOfficeManager } from "@/components/admin/destination-office-manager";
import { SettingsForm, SettingsNav } from "@/components/admin/settings-form";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { requireAdminPage } from "@/lib/auth/guards";
import { settingsService } from "@/server/services/settingsService";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  await requireAdminPage("/settings");
  const [settings, offices] = await Promise.all([
    settingsService.getSettings(),
    settingsService.listOffices(),
  ]);

  return (
    <>
      <PageHeader
        title="Settings"
        description="Organisation, units, and personal profile."
        breadcrumbs={[
          { label: "Overview", href: "/dashboard" },
          { label: "Settings" },
        ]}
      >
        <SettingsNav active="app" />
      </PageHeader>

      <PageBody className="space-y-6">
        <section aria-labelledby="organisation-heading">
          <h2 id="organisation-heading" className="sr-only">
            Organisation
          </h2>
          <SettingsForm values={settings} canEdit />
        </section>

        <section aria-labelledby="units-heading">
          <h2 id="units-heading" className="sr-only">
            Units
          </h2>
          <DestinationOfficeManager offices={offices} />
        </section>

        <SectionCard title="Personal profile">
          <p className="text-muted-foreground text-sm">
            Change your own password on{" "}
            <Link href="/settings/profile" className="text-primary hover:underline">
              My profile
            </Link>
            .
          </p>
        </SectionCard>
      </PageBody>
    </>
  );
}
