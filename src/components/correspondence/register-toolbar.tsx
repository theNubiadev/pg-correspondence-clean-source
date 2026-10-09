"use client";

import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { CORRESPONDENCE_STATUSES, STATUS_META } from "@/lib/constants";
import { useFilterParams } from "@/hooks/use-filter-params";

type OfficeOption = { id: string; officeName: string };

export function RegisterToolbar({
  total,
  offices,
  hideOfficeFilter = false,
  showPvFilter = false,
}: {
  total: number;
  offices: OfficeOption[];
  hideOfficeFilter?: boolean;
  showPvFilter?: boolean;
}) {
  const router = useRouter();
  const { get, setParams, clearAll } = useFilterParams();

  const q = get("q") ?? "";
  const status = get("status") ?? "";
  const destinationOfficeId = get("destinationOfficeId") ?? "";
  const pvNumber = showPvFilter ? (get("pvNumber") ?? "") : "";
  const batchNumber = get("batchNumber") ?? "";
  const from = get("from") ?? "";
  const to = get("to") ?? "";
  const view = get("view");

  const chips = [
    q ? { key: "q", label: `Search: ${q}` } : null,
    status
      ? {
          key: "status",
          label: STATUS_META[status as keyof typeof STATUS_META]?.label ?? status,
        }
      : null,
    destinationOfficeId
      ? {
          key: "destinationOfficeId",
          label:
            offices.find((office) => office.id === destinationOfficeId)
              ?.officeName ?? "Destination",
        }
      : null,
    showPvFilter && pvNumber
      ? { key: "pvNumber", label: `PV: ${pvNumber}` }
      : null,
    batchNumber ? { key: "batchNumber", label: `Batch: ${batchNumber}` } : null,
    from ? { key: "from", label: `From ${from}` } : null,
    to ? { key: "to", label: `To ${to}` } : null,
  ].filter(Boolean) as { key: string; label: string }[];

  return (
    <div className="surface-flat space-y-3 p-4">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setParams({
            q: String(data.get("q") ?? ""),
            status: String(data.get("status") ?? ""),
            destinationOfficeId: String(data.get("destinationOfficeId") ?? ""),
            ...(showPvFilter
              ? { pvNumber: String(data.get("pvNumber") ?? "") }
              : {}),
            batchNumber: String(data.get("batchNumber") ?? ""),
            from: String(data.get("from") ?? ""),
            to: String(data.get("to") ?? ""),
            page: "1",
          });
        }}
      >
        <div className="min-w-[14rem] flex-1 space-y-1">
          <label htmlFor="q" className="text-xs font-medium">
            Search this register
          </label>
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              id="q"
              name="q"
              defaultValue={q}
              placeholder="Reference, name, ID or subject"
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="status" className="text-xs font-medium">
            Status
          </label>
          <NativeSelect
            id="status"
            name="status"
            defaultValue={status}
            className="min-w-[12rem]"
          >
            <option value="">All statuses</option>
            {CORRESPONDENCE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {STATUS_META[value].label}
              </option>
            ))}
          </NativeSelect>
        </div>

        {hideOfficeFilter ? null : (
          <div className="space-y-1">
            <label htmlFor="destinationOfficeId" className="text-xs font-medium">
              Destination
            </label>
            <NativeSelect
              id="destinationOfficeId"
              name="destinationOfficeId"
              defaultValue={destinationOfficeId}
              className="min-w-[12rem]"
            >
              <option value="">All units</option>
              {offices.map((office) => (
                <option key={office.id} value={office.id}>
                  {office.officeName}
                </option>
              ))}
            </NativeSelect>
          </div>
        )}

        {showPvFilter ? (
          <div className="space-y-1">
            <label htmlFor="pvNumber" className="text-xs font-medium">
              Finance PV number
            </label>
            <Input
              id="pvNumber"
              name="pvNumber"
              defaultValue={pvNumber}
              className="min-w-[10rem] font-mono"
              placeholder="PV…"
            />
          </div>
        ) : null}

        <div className="space-y-1">
          <label htmlFor="batchNumber" className="text-xs font-medium">
            Batch number
          </label>
          <Input
            id="batchNumber"
            name="batchNumber"
            defaultValue={batchNumber}
            className="min-w-[10rem] font-mono"
            placeholder="Batch…"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="from" className="text-xs font-medium">
            Date received — from
          </label>
          <Input id="from" name="from" type="date" defaultValue={from} />
        </div>

        <div className="space-y-1">
          <label htmlFor="to" className="text-xs font-medium">
            Date received — to
          </label>
          <Input id="to" name="to" type="date" defaultValue={to} />
        </div>

        <Button type="submit">Apply</Button>
        <Button asChild variant="outline">
          <a
            href={`/api/export/register?${new URLSearchParams({
              ...(q ? { q } : {}),
              ...(status ? { status } : {}),
              ...(destinationOfficeId ? { destinationOfficeId } : {}),
              ...(pvNumber ? { pvNumber } : {}),
              ...(batchNumber ? { batchNumber } : {}),
              ...(from ? { from } : {}),
              ...(to ? { to } : {}),
              ...(view ? { view } : {}),
            }).toString()}`}
          >
            Export
          </a>
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            clearAll();
            router.push("/correspondence");
          }}
        >
          Clear all
        </Button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <p className="text-muted-foreground text-sm tabular-nums">
          {total} result{total === 1 ? "" : "s"}
          {view ? ` in this view` : ""}
        </p>
        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            className="border-border inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
            onClick={() => setParams({ [chip.key]: "", page: "1" })}
          >
            {chip.label}
            <X className="size-3" aria-hidden="true" />
            <span className="sr-only">Remove {chip.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
