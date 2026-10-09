"use client";

import { useActionState } from "react";

import { Field } from "@/components/forms/field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { toDateInputValue } from "@/lib/format";
import { reportOrphanPhysicalAction } from "@/server/actions/correspondence";
import { idleState } from "@/server/actions/types";

export function OrphanReportForm({
  offices,
}: {
  offices: { id: string; officeName: string }[];
}) {
  const [state, formAction] = useActionState(
    reportOrphanPhysicalAction,
    idleState,
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-3">
      <FormMessage state={state} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="From unit" error={errors.sendingOfficeId}>
          {(props) => (
            <NativeSelect {...props} name="sendingOfficeId" defaultValue="">
              <option value="">Not known</option>
              {offices.map((office) => (
                <option key={office.id} value={office.id}>
                  {office.officeName}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
        <Field label="Reference" error={errors.referenceHint}>
          {(props) => (
            <Input {...props} name="referenceHint" placeholder="PROV/2026/000123" />
          )}
        </Field>
        <Field label="Arrived" error={errors.datePhysicalReceived} required>
          {(props) => (
            <Input
              {...props}
              name="datePhysicalReceived"
              type="date"
              defaultValue={toDateInputValue(new Date())}
            />
          )}
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name on the letter" error={errors.applicantNameHint} optional>
          {(props) => <Input {...props} name="applicantNameHint" />}
        </Field>
        <Field label="Subject" error={errors.subjectHint} optional>
          {(props) => <Input {...props} name="subjectHint" />}
        </Field>
      </div>
      <Field label="What is missing" error={errors.comment} required>
        {(props) => (
          <Textarea
            {...props}
            name="comment"
            rows={2}
            placeholder="Paper is here, but there is no matching register entry."
            className="resize-y"
          />
        )}
      </Field>
      <SubmitButton pendingLabel="Sending…" size="sm">
        Report missing entry
      </SubmitButton>
    </form>
  );
}
