import type { Metadata } from "next";

import { StaffManager } from "@/components/admin/staff-manager";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { requireAdminPage } from "@/lib/auth/guards";
import { userService } from "@/server/services/userService";

export const metadata: Metadata = {
  title: "Users",
};

export default async function StaffPage() {
  await requireAdminPage("/staff");
  const users = await userService.list();

  return (
    <>
      <PageHeader
        title="Users"
        description="Create, edit, activate and reset passwords for staff accounts."
        breadcrumbs={[
          { label: "Overview", href: "/dashboard" },
          { label: "Users" },
        ]}
      />
      <PageBody>
        <StaffManager users={users} />
      </PageBody>
    </>
  );
}
