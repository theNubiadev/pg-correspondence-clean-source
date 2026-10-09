"use client";

import { useActionState } from "react";

import { Field } from "@/components/forms/field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { resolveOrphanPhysicalAction } from "@/server/actions/correspondence";
import { idleState } from "@/server/actions/types";

export function OrphanResolveForm({ id }: { id: string }) {
  const [state, formAction] = useActionState(
    resolveOrphanPhysicalAction,
    idleState,
  );

  return (
    <form action={formAction} className="mt-2 space-y-2">
      <input type="hidden" name="id" value={id} />
      <FormMessage state={state} />
      <Field label="Link to correspondence id" error={state.fieldErrors?.correspondenceId}>
        {(props) => (
          <Input {...props} name="correspondenceId" placeholder="Optional" />
        )}
      </Field>
      <Field label="Resolution comment" error={state.fieldErrors?.comment} required>
        {(props) => (
          <Textarea {...props} name="comment" rows={2} className="resize-y" />
        )}
      </Field>
      <SubmitButton pendingLabel="Resolving…">Resolve report</SubmitButton>
    </form>
  );
}
