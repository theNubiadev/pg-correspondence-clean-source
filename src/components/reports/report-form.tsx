"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

const PERIODS = [
  { value: "daily", label: "Daily (today)" },
  { value: "weekly", label: "Weekly (last 7 days)" },
  { value: "monthly", label: "Monthly (last 30 days)" },
  { value: "yearly", label: "Yearly (last 12 months)" },
  { value: "custom", label: "Custom date range" },
] as const;

export function ReportForm({ scope }: { scope: string }) {
  const [period, setPeriod] = useState("monthly");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action="/reports/preview"
      method="get"
      className="space-y-6"
      onSubmit={(event) => {
        const data = new FormData(event.currentTarget);
        const selected = String(data.get("period") ?? "");
        if (selected !== "custom") {
          setError(null);
          return;
        }
        const from = String(data.get("from") ?? "");
        const to = String(data.get("to") ?? "");
        if (!from || !to) {
          event.preventDefault();
          setError("Choose both a start date and an end date.");
          return;
        }
        if (from > to) {
          event.preventDefault();
          setError("The end date must be on or after the start date.");
        }
      }}
    >
      <p className="text-muted-foreground text-sm">{scope}</p>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="period">Period</Label>
          <NativeSelect
            id="period"
            name="period"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          >
            {PERIODS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="format">Format</Label>
          <NativeSelect id="format" name="format" defaultValue="xlsx">
            <option value="xlsx">Export Excel (.xlsx)</option>
            <option value="pdf">Print / PDF preview</option>
          </NativeSelect>
        </div>
        {period === "custom" ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="from">From</Label>
              <Input id="from" name="from" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to">To</Label>
              <Input id="to" name="to" type="date" required />
            </div>
          </>
        ) : null}
      </div>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit">Generate report</Button>
    </form>
  );
}
