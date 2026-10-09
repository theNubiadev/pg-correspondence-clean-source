"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from "lucide-react";
import type { CorrespondenceStatus } from "@prisma/client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/correspondence/status-badge";
import { useFilterParams } from "@/hooks/use-filter-params";
import { formatDate, truncate } from "@/lib/format";

type RegisterRow = {
  id: string;
  referenceNumber: string;
  studentName: string;
  addresseeName?: string | null;
  batchNumber?: string | null;
  matricNumber: string;
  faculty: string;
  department: string;
  subject: string;
  dateReceived: Date;
  status: CorrespondenceStatus;
  destinationOffice: { id: string; officeName: string } | null;
  createdBy: { id: string; fullName: string };
  handoffs?: Array<{ state: import("@prisma/client").PhysicalReceiptState }> | null;
};

export type RegisterResult = {
  items: RegisterRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

const SORTABLE = new Set([
  "referenceNumber",
  "studentName",
  "status",
  "dateReceived",
]);

export function RegisterTable({ result }: { result: RegisterResult }) {
  const { get, setParams } = useFilterParams();

  const sort = get("sort") ?? "dateReceived";
  const dir = (get("dir") ?? "desc") as "asc" | "desc";

  const columns = useMemo<ColumnDef<RegisterRow>[]>(
    () => [
      {
        id: "referenceNumber",
        header: "Reference",
        cell: ({ row }) => (
          <Link
            href={`/correspondence/${row.original.id}`}
            className="font-mono text-xs font-semibold hover:underline"
          >
            {row.original.referenceNumber}
          </Link>
        ),
      },
      {
        id: "studentName",
        header: "Applicant",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-sm font-medium">{row.original.studentName}</p>
            {row.original.addresseeName ? (
              <p className="text-muted-foreground text-xs">
                To {row.original.addresseeName}
              </p>
            ) : null}
            {row.original.batchNumber ? (
              <p className="text-muted-foreground font-mono text-xs">
                Batch {row.original.batchNumber}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        id: "subject",
        header: "Subject",
        cell: ({ row }) => (
          <span className="text-sm">{truncate(row.original.subject, 64)}</span>
        ),
      },
      {
        id: "destinationOffice",
        header: "Destination",
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.destinationOffice?.officeName ?? "—"}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.status}
            handoffState={row.original.handoffs?.[0]?.state}
            size="sm"
          />
        ),
      },
      {
        id: "dateReceived",
        header: "Received",
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">
            {formatDate(row.original.dateReceived)}
          </span>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: result.items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  function toggleSort(column: string) {
    const nextDir = sort === column && dir === "desc" ? "asc" : "desc";
    setParams({ sort: column, dir: nextDir, page: "1" });
  }

  function ariaSort(column: string): "ascending" | "descending" | "none" | undefined {
    if (!SORTABLE.has(column)) return undefined;
    if (sort !== column) return "none";
    return dir === "asc" ? "ascending" : "descending";
  }

  const empty = (
    <EmptyState
      title="No correspondence matches this view"
      description="Clear the filters or choose another saved view."
    />
  );

  return (
    <div className="space-y-4">
      <div className="surface-flat hidden overflow-x-auto md:block">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => (
                  <TableHead key={header.id} aria-sort={ariaSort(header.column.id)}>
                    {SORTABLE.has(header.column.id) ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(header.column.id)}
                        className="inline-flex items-center gap-1 font-medium"
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {sort === header.column.id ? (
                          dir === "asc" ? (
                            <ArrowUp className="size-3.5" aria-hidden="true" />
                          ) : (
                            <ArrowDown className="size-3.5" aria-hidden="true" />
                          )
                        ) : null}
                      </button>
                    ) : (
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length}>{empty}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 md:hidden">
        {result.items.length === 0 ? (
          <div className="surface-flat">{empty}</div>
        ) : (
          result.items.map((item) => (
            <Link
              key={item.id}
              href={`/correspondence/${item.id}`}
              className="surface-flat block space-y-2 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-mono text-xs font-semibold">
                  {item.referenceNumber}
                </span>
                <StatusBadge
                  status={item.status}
                  handoffState={item.handoffs?.[0]?.state}
                  size="sm"
                />
              </div>
              <p className="text-sm font-medium">{item.studentName}</p>
              <p className="text-muted-foreground text-xs">{item.subject}</p>
              <p className="text-muted-foreground text-xs">
                {item.destinationOffice?.officeName ?? "Not routed"} ·{" "}
                {formatDate(item.dateReceived)}
              </p>
            </Link>
          ))
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm tabular-nums">
          {result.total === 0
            ? "No records"
            : `Showing ${(result.page - 1) * result.pageSize + 1}–${Math.min(result.page * result.pageSize, result.total)} of ${result.total}`}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={result.page <= 1}
            onClick={() => setParams({ page: String(result.page - 1) }, { resetPage: false })}
          >
            <ChevronLeft className="size-4" />
            Previous
          </Button>
          <span className="text-sm tabular-nums">
            Page {result.page} of {Math.max(result.pageCount, 1)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={result.page >= result.pageCount}
            onClick={() => setParams({ page: String(result.page + 1) }, { resetPage: false })}
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
