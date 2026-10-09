import type { Metadata } from "next";

import { ProfileForms } from "@/components/admin/profile-forms";
import { SettingsNav } from "@/components/admin/settings-form";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { requireRegisterPage } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "My profile",
};

export default async function ProfileSettingsPage() {
  const user = await requireRegisterPage("/settings/profile");

  return (
    <>
      <PageHeader
        title="My profile"
        description="View your account details and change your password."
        breadcrumbs={[
          { label: "Overview", href: "/dashboard" },
          { label: "Settings", href: "/settings" },
          { label: "My profile" },
        ]}
      >
        <SettingsNav active="profile" />
      </PageHeader>

      <PageBody>
        <ProfileForms
          profile={{
            fullName: user.fullName,
            username: user.username,
            email: user.email,
            role: user.role,
          }}
        />
      </PageBody>
    </>
  );
}
