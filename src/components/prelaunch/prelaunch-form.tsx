"use client";

import { useActionState } from "react";

import { Field } from "@/components/forms/field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toDateInputValue } from "@/lib/format";
import { recordPrelaunchEventAction } from "@/server/actions/prelaunch";
import { idleState } from "@/server/actions/types";

export function PrelaunchForm() {
  const [state, formAction] = useActionState(recordPrelaunchEventAction, idleState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="surface space-y-5 p-5 sm:p-6" noValidate>
      <div>
        <h2 className="text-sm font-semibold">Record an event</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Title, date, and who was briefed. This is the go-live briefing, not a letter.
        </p>
      </div>

      <FormMessage state={state} />

      <Field label="Event title" error={errors.title} required>
        {(props) => (
          <Input
            {...props}
            name="title"
            placeholder="Registry pre-launch briefing"
          />
        )}
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Date held" error={errors.heldAt} required>
          {(props) => (
            <Input
              {...props}
              name="heldAt"
              type="date"
              defaultValue={toDateInputValue(new Date())}
            />
          )}
        </Field>
        <Field label="Venue" error={errors.venue} optional>
          {(props) => (
            <Input {...props} name="venue" placeholder="Provost's conference room" />
          )}
        </Field>
      </div>

      <Field label="Notes" error={errors.notes} optional>
        {(props) => (
          <Textarea
            {...props}
            name="notes"
            rows={4}
            placeholder="Who attended, and what was agreed before go-live."
          />
        )}
      </Field>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Saving…">Save event</SubmitButton>
      </div>
    </form>
  );
}
