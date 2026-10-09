"use client";

import { useActionState, useMemo, useState } from "react";

import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Field } from "@/components/forms/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createDestinationOfficeAction,
  deleteDestinationOfficeAction,
  updateDestinationOfficeAction,
} from "@/server/actions/admin";
import { idleState } from "@/server/actions/types";

type OfficeRow = {
  id: string;
  officeName: string;
  status: "ACTIVE" | "INACTIVE";
};

export function DestinationOfficeManager({ offices }: { offices: OfficeRow[] }) {
  const [createState, createAction] = useActionState(
    createDestinationOfficeAction,
    idleState,
  );
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [editing, setEditing] = useState<OfficeRow | null>(null);

  const visible = useMemo(
    () =>
      offices.filter((office) => (filter === "ALL" ? true : office.status === filter)),
    [offices, filter],
  );

  return (
    <SectionCard
      title="Units"
      description="Destination offices correspondence can be dispatched to."
    >
      <form action={createAction} className="mb-6 flex flex-wrap items-end gap-3">
        <FormMessage state={createState} />
        <Field label="New unit name" error={createState.fieldErrors?.officeName}>
          {(props) => <Input {...props} name="officeName" className="min-w-[16rem]" />}
        </Field>
        <SubmitButton pendingLabel="Adding…">Add unit</SubmitButton>
      </form>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm tabular-nums">
          {visible.length} unit{visible.length === 1 ? "" : "s"}
        </p>
        <NativeSelect
          aria-label="Filter units"
          value={filter}
          onChange={(event) =>
            setFilter(event.target.value as "ALL" | "ACTIVE" | "INACTIVE")
          }
          className="w-40"
        >
          <option value="ALL">All units</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </NativeSelect>
      </div>

      <ul className="divide-y">
        {visible.map((office) => (
          <li key={office.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className="text-sm font-medium">{office.officeName}</p>
              <Badge
                variant={office.status === "ACTIVE" ? "default" : "secondary"}
                className="mt-1"
              >
                {office.status === "ACTIVE" ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(office)}>
                Edit
              </Button>
              <DeleteUnitButton id={office.id} name={office.officeName} />
            </div>
          </li>
        ))}
      </ul>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit unit</DialogTitle>
          </DialogHeader>
          {editing ? (
            <OfficeEditor
              key={editing.id}
              office={editing}
              onDone={() => setEditing(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}

function DeleteUnitButton({ id, name }: { id: string; name: string }) {
  const [state, formAction] = useActionState(deleteDestinationOfficeAction, idleState);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(`Delete ${name}? This cannot be undone.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <FormMessage state={state} />
      <SubmitButton size="sm" variant="outline" pendingLabel="Deleting…">
        Delete
      </SubmitButton>
    </form>
  );
}

function OfficeEditor({
  office,
}: {
  office: OfficeRow;
  onDone: () => void;
}) {
  const [state, formAction] = useActionState(updateDestinationOfficeAction, idleState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={office.id} />
      <FormMessage state={state} />
      <Field label="Unit name" error={state.fieldErrors?.officeName} required>
        {(props) => (
          <Input {...props} name="officeName" defaultValue={office.officeName} />
        )}
      </Field>
      <Field label="Status">
        {(props) => (
          <NativeSelect {...props} name="status" defaultValue={office.status}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </NativeSelect>
        )}
      </Field>
      <SubmitButton pendingLabel="Saving…">Save unit</SubmitButton>
    </form>
  );
}
