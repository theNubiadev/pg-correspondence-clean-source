"use client";

import { useActionState } from "react";
import Link from "next/link";

import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Field, FieldGroup } from "@/components/forms/field";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/section-card";
import { saveSettingsAction } from "@/server/actions/admin";
import { idleState } from "@/server/actions/types";
import type { AppSettings } from "@/server/repositories/settingsRepository";

export function SettingsForm({
  values,
  canEdit,
}: {
  values: AppSettings;
  canEdit: boolean;
}) {
  const [state, formAction] = useActionState(saveSettingsAction, idleState);

  return (
    <SectionCard
      title="Organisation settings"
      description={
        canEdit
          ? "Institution names shown on the register and reports."
          : "Only a Super Administrator can change these settings."
      }
    >
      <form action={formAction} className="space-y-6">
        <FormMessage state={state} />

        <FieldGroup title="Institution">
          <Field label="University name" error={state.fieldErrors?.universityName}>
            {(props) => (
              <Input
                {...props}
                name="universityName"
                defaultValue={values.universityName}
                disabled={!canEdit}
              />
            )}
          </Field>
          <Field label="PG School name" error={state.fieldErrors?.pgSchoolName}>
            {(props) => (
              <Input
                {...props}
                name="pgSchoolName"
                defaultValue={values.pgSchoolName}
                disabled={!canEdit}
              />
            )}
          </Field>
        </FieldGroup>

        {canEdit ? (
          <SubmitButton pendingLabel="Saving…">Save settings</SubmitButton>
        ) : null}
      </form>
    </SectionCard>
  );
}

export function SettingsNav({ active }: { active: "app" | "profile" }) {
  return (
    <nav className="flex gap-2 text-sm">
      <Link
        href="/settings"
        className={active === "app" ? "text-primary font-medium" : "text-muted-foreground"}
      >
        Application
      </Link>
      <Link
        href="/settings/profile"
        className={
          active === "profile" ? "text-primary font-medium" : "text-muted-foreground"
        }
      >
        My profile
      </Link>
    </nav>
  );
}
