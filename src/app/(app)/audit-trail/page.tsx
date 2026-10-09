import type { Metadata } from "next";
import Link from "next/link";

import { PageBody, PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdminPage } from "@/lib/auth/guards";
import { formatDateTime, humanizeEnum } from "@/lib/format";
import { getAuditLogs } from "@/server/queries/audit";

export const metadata: Metadata = {
  title: "Audit logs",
};

export default async function AuditTrailPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    action?: string;
    module?: string;
  }>;
}) {
  await requireAdminPage("/audit-trail");
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const q = params.q?.trim() ?? "";
  const action = params.action?.trim() ?? "";
  const moduleFilter = params.module?.trim() ?? "";
  const result = await getAuditLogs(page, {
    q: q || undefined,
    action: action || undefined,
    module: moduleFilter || undefined,
  });

  return (
    <>
      <PageHeader
        title="Audit logs"
        description="System and security events. Correspondence movement is shown on each letter."
        breadcrumbs={[
          { label: "Overview", href: "/dashboard" },
          { label: "Audit logs" },
        ]}
      />
      <PageBody className="space-y-4">
        <form className="surface-flat flex flex-wrap items-end gap-3 p-4" method="get">
          <div className="min-w-[12rem] flex-1 space-y-1">
            <label htmlFor="q" className="text-xs font-medium">
              Search
            </label>
            <Input
              id="q"
              name="q"
              defaultValue={q}
              placeholder="Action, module, user or record id"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="action" className="text-xs font-medium">
              Action
            </label>
            <Input id="action" name="action" defaultValue={action} placeholder="e.g. CREATE" />
          </div>
          <div className="space-y-1">
            <label htmlFor="module" className="text-xs font-medium">
              Module
            </label>
            <NativeSelect id="module" name="module" defaultValue={moduleFilter}>
              <option value="">All modules</option>
              <option value="correspondence">Correspondence</option>
              <option value="auth">Authentication</option>
              <option value="admin">Administration</option>
            </NativeSelect>
          </div>
          <Button type="submit">Apply</Button>
          <Button asChild type="button" variant="ghost">
            <Link href="/audit-trail">Clear</Link>
          </Button>
        </form>

        <div className="surface-flat overflow-x-auto">
          {result.items.length === 0 ? (
            <EmptyState
              title="No audit entries match these filters"
              description="Try a broader search. Passwords and other credential material are never stored here."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Summary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-xs tabular-nums">
                      {formatDateTime(entry.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {entry.user?.fullName ?? "System"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {humanizeEnum(entry.action)}
                    </TableCell>
                    <TableCell className="text-sm">{entry.module}</TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate font-mono text-xs">
                      {summarizeDetails(entry.details)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground tabular-nums">
            Page {result.page} of {Math.max(result.pageCount, 1)} ({result.total}{" "}
            entries)
          </span>
          <div className="flex gap-2">
            {result.page > 1 ? (
              <Link
                href={auditHref({ ...params, page: String(result.page - 1) })}
                className="text-primary"
              >
                Previous
              </Link>
            ) : null}
            {result.page < result.pageCount ? (
              <Link
                href={auditHref({ ...params, page: String(result.page + 1) })}
                className="text-primary"
              >
                Next
              </Link>
            ) : null}
          </div>
        </div>
      </PageBody>
    </>
  );
}

function summarizeDetails(details?: string | null) {
  if (!details) return "—";
  const lowered = details.toLowerCase();
  if (
    lowered.includes("password") ||
    lowered.includes("pass") ||
    lowered.includes("token") ||
    lowered.includes("secret")
  ) {
    return "Recorded without credential material";
  }
  return details;
}

function auditHref(params: {
  page?: string;
  q?: string;
  action?: string;
  module?: string;
}) {
  const search = new URLSearchParams();
  if (params.page) search.set("page", params.page);
  if (params.q) search.set("q", params.q);
  if (params.action) search.set("action", params.action);
  if (params.module) search.set("module", params.module);
  const query = search.toString();
  return query ? `/audit-trail?${query}` : "/audit-trail";
}
