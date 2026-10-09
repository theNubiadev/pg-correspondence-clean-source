import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { RegisterToolbar } from "@/components/correspondence/register-toolbar";
import { RegisterTable } from "@/components/correspondence/register-table";
import { ViewTabs } from "@/components/correspondence/view-tabs";
import { requireRegisterPage } from "@/lib/auth/guards";
import {
  canCreateCorrespondence,
  canManageFinancePv,
  isDepartmentStaff,
  isSuperAdmin,
} from "@/lib/auth/permissions";
import { isRegisterViewKey, registerView } from "@/lib/register-views";
import { getRegister, getFilterOptions } from "@/server/queries/correspondence";

export const metadata: Metadata = {
  title: "Register",
  description: "Every letter received by the Provost's Office.",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireRegisterPage("/correspondence");
  const params = await searchParams;
  const isDept = isDepartmentStaff(user);
  const isAdmin = isSuperAdmin(user);
  const canCreate = canCreateCorrespondence(user);

  const [result, options] = await Promise.all([
    getRegister(params, user),
    getFilterOptions(),
  ]);

  const activeView = isRegisterViewKey(params.view) ? params.view : undefined;
  const view = registerView(activeView);

  return (
    <>
      <PageHeader
        dense
        title={isAdmin ? "College register" : "Correspondence register"}
        description={
          view
            ? view.description
            : isDept
              ? "Every letter across the college. Your dashboard still shows only letters assigned to your unit."
              : isAdmin
                ? "Every letter across the college — all units, all statuses."
                : "Every letter logged at the Provost's Office counter."
        }
        breadcrumbs={[
          { label: "Overview", href: "/dashboard" },
          { label: "Register", href: activeView ? "/correspondence" : undefined },
          ...(view ? [{ label: view.label }] : []),
        ]}
        actions={
          canCreate ? (
            <Button asChild size="sm">
              <Link href="/correspondence/new">Log correspondence</Link>
            </Button>
          ) : undefined
        }
      >
        <ViewTabs activeView={activeView} total={activeView ? undefined : result.total} />
      </PageHeader>

      <PageBody className="space-y-4">
        <Suspense fallback={<ToolbarSkeleton />}>
          <RegisterToolbar
            total={result.total}
            offices={options.offices}
            hideOfficeFilter={false}
            showPvFilter={canManageFinancePv(user)}
          />
        </Suspense>

        <Suspense fallback={<TableSkeleton />}>
          <RegisterTable result={result} />
        </Suspense>
      </PageBody>
    </>
  );
}

function ToolbarSkeleton() {
  return <Skeleton className="surface h-24 w-full" />;
}

function TableSkeleton() {
  return (
    <div className="surface divide-y">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 p-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      ))}
    </div>
  );
}
