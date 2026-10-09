"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup } from "@/components/forms/field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { toDateInputValue } from "@/lib/format";
import { dispatchCorrespondenceAction } from "@/server/actions/correspondence";
import { idleState } from "@/server/actions/types";

type OfficeOption = { id: string; officeName: string };

const OTHER_VALUE = "__other__";

export function DispatchForm({
  correspondenceId,
  dateReceived,
  offices,
  defaultDestinationOfficeId,
  defaultDateLeaving,
  mode = "dispatch",
}: {
  correspondenceId: string;
  dateReceived: Date;
  offices: OfficeOption[];
  defaultDestinationOfficeId?: string | null;
  defaultDateLeaving?: Date | null;
  mode?: "dispatch" | "forward";
}) {
  const [state, formAction] = useActionState(
    dispatchCorrespondenceAction,
    idleState,
  );
  const [destinationMode, setDestinationMode] = useState<string>(
    defaultDestinationOfficeId ?? "",
  );
  const errors = state.fieldErrors ?? {};
  const showCustom = destinationMode === OTHER_VALUE;

  return (
    <form
      action={formAction}
      className="mx-auto max-w-xl space-y-6"
      noValidate
    >
      <input type="hidden" name="id" value={correspondenceId} />
      <input type="hidden" name="dateReceived" value={dateReceived.toISOString()} />

      <FormMessage state={state} />

      <section className="surface space-y-5 p-5 sm:p-6">
        <FieldGroup
          title="Routing"
          description={
            mode === "forward"
              ? "Send this letter to another unit. Leave a comment so the trail shows why it moved."
              : "Choose a college unit, or type a destination outside the college. Leave a comment on this movement."
          }
        >
          <Field
            label="Destination unit"
            error={errors.destinationOfficeId ?? errors.customDestination}
            required
          >
            {(props) => (
              <select
                {...props}
                id={props.id}
                name="destinationOfficeId"
                value={destinationMode}
                onChange={(event) => setDestinationMode(event.target.value)}
                className="border-input bg-background focus-visible:ring-ring/45 h-9 w-full rounded-md border px-3 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:outline-none"
              >
                <option value="">Choose a unit</option>
                {offices.map((office) => (
                  <option key={office.id} value={office.id}>
                    {office.officeName}
                  </option>
                ))}
                <option value={OTHER_VALUE}>Other (outside college)…</option>
              </select>
            )}
          </Field>

          {showCustom ? (
            <Field
              label="Outside unit / organisation"
              error={errors.customDestination}
              required
              hint="Type the full name of the destination outside the college."
            >
              {(props) => (
                <Input
                  {...props}
                  name="customDestination"
                  placeholder="e.g. Federal Ministry of Education"
                  autoFocus
                />
              )}
            </Field>
          ) : (
            <input type="hidden" name="customDestination" value="" />
          )}

          <Field
            label="Date leaving the office"
            error={errors.dateSentToOffice}
            required
          >
            {(props) => (
              <Input
                {...props}
                name="dateSentToOffice"
                type="date"
                defaultValue={toDateInputValue(
                  defaultDateLeaving ?? new Date(),
                )}
                min={toDateInputValue(dateReceived)}
              />
            )}
          </Field>

          <Field
            label="Letter scan / photo (optional)"
            optional
            hint="Scan or photograph the letter (PDF or image). On a phone this can open the camera. Does not replace physical acknowledgement."
          >
            {(props) => (
              <Input
                {...props}
                name="attachment"
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp,image/gif"
                capture="environment"
              />
            )}
          </Field>
        </FieldGroup>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button asChild variant="ghost">
          <Link href={`/correspondence/${correspondenceId}`}>Cancel</Link>
        </Button>
        <SubmitButton
          pendingLabel={mode === "forward" ? "Sending…" : "Dispatching…"}
          icon={<Send className="size-4" aria-hidden="true" />}
        >
          {mode === "forward" ? "Send to another unit" : "Send to unit"}
        </SubmitButton>
      </div>
    </form>
  );
}
