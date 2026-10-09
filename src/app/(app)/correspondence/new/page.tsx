import type { Metadata } from "next";

import { CorrespondenceForm } from "@/components/correspondence/correspondence-form";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { requireCreatePage } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Log correspondence",
  description: "Record a new letter in the register.",
};

export default async function NewCorrespondencePage() {
  await requireCreatePage("/correspondence/new");

  return (
    <>
      <PageHeader
        title="Log correspondence"
        description="Record who wrote the letter and the date received. You choose the destination unit later, when you send it."
        breadcrumbs={[
          { label: "Overview", href: "/dashboard" },
          { label: "Register", href: "/correspondence" },
          { label: "New" },
        ]}
      />
      <PageBody>
        <CorrespondenceForm mode="create" />
      </PageBody>
    </>
  );
}
