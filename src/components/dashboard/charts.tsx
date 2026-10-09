"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { CHART_COLORS } from "@/lib/constants";
import { formatNumber } from "@/lib/format";

type StatusPoint = {
  status: string;
  label: string;
  count: number;
  token: string;
};

type OfficePoint = {
  id: string;
  name: string;
  count: number;
};

/** Statuses share one colour language with the badges used across the app. */
function statusColor(entry: StatusPoint, index: number): string {
  return `var(${entry.token}, ${CHART_COLORS[index % CHART_COLORS.length]})`;
}

export function StatusDonut({ data }: { data: StatusPoint[] }) {
  if (!data.length) {
    return <p className="text-muted-foreground py-8 text-center text-sm">No data yet.</p>;
  }

  const total = data.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="relative h-[220px] w-full shrink-0 sm:w-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="label"
              innerRadius={64}
              outerRadius={92}
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((entry, index) => (
                <Cell key={entry.status} fill={statusColor(entry, index)} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [formatNumber(Number(value)), name]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="tabular text-2xl font-semibold tracking-tight">
            {formatNumber(total)}
          </span>
          <span className="text-muted-foreground text-xs">Total</span>
        </div>
      </div>

      <ul className="w-full min-w-0 space-y-2.5">
        {data.map((entry, index) => (
          <li
            key={entry.status}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: statusColor(entry, index) }}
              />
              <span className="truncate">{entry.label}</span>
            </span>
            <span className="tabular text-muted-foreground shrink-0 font-medium">
              {formatNumber(entry.count)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DestinationOfficeChart({ data }: { data: OfficePoint[] }) {
  if (!data.length) {
    return <p className="text-muted-foreground py-8 text-center text-sm">No data yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart
        data={data.slice(0, 10)}
        layout="vertical"
        margin={{ left: 8, right: 40 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(value) => formatNumber(Number(value))} />
        <Bar dataKey="count" fill="var(--chart-1)" radius={[0, 4, 4, 0]}>
          <LabelList
            dataKey="count"
            position="right"
            className="fill-muted-foreground"
            fontSize={11}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
