"use client";

import { useActionState } from "react";

import { Field } from "@/components/forms/field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { SectionCard } from "@/components/ui/section-card";
import { Input } from "@/components/ui/input";
import { changePasswordAction } from "@/server/actions/auth";
import { idleState } from "@/server/actions/types";
import { ROLE_META } from "@/lib/constants";
import type { UserRole } from "@prisma/client";

type Profile = {
  fullName: string;
  username: string;
  email: string;
  role: UserRole;
};

export function ProfileForms({ profile }: { profile: Profile }) {
  const [passwordState, passwordAction] = useActionState(changePasswordAction, idleState);

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <SectionCard title="Your account" description="Read-only account details.">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Full name</dt>
            <dd className="font-medium">{profile.fullName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Username</dt>
            <dd>{profile.username}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd>{profile.email}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Role</dt>
            <dd>{ROLE_META[profile.role].label}</dd>
          </div>
        </dl>
      </SectionCard>

      <SectionCard title="Change password" description="Choose a strong password.">
        <form action={passwordAction} className="space-y-5">
          <FormMessage state={passwordState} />

          <Field label="Current password" required error={passwordState.fieldErrors?.currentPassword}>
            {(props) => (
              <Input {...props} name="currentPassword" type="password" autoComplete="current-password" />
            )}
          </Field>

          <Field label="New password" required error={passwordState.fieldErrors?.password}>
            {(props) => (
              <Input {...props} name="password" type="password" autoComplete="new-password" />
            )}
          </Field>

          <Field label="Confirm new password" required error={passwordState.fieldErrors?.confirmPassword}>
            {(props) => (
              <Input {...props} name="confirmPassword" type="password" autoComplete="new-password" />
            )}
          </Field>

          <SubmitButton pendingLabel="Changing password…">Change password</SubmitButton>
        </form>
      </SectionCard>
    </div>
  );
}
