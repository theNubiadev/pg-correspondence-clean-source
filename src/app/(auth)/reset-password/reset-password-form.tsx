"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/forms/field";
import { FormMessage } from "@/components/forms/form-message";
import { PasswordStrength } from "@/components/forms/password-strength";
import { SubmitButton } from "@/components/forms/submit-button";
import { resetPasswordAction } from "@/server/actions/auth";
import { idleState } from "@/server/actions/types";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(resetPasswordAction, idleState);
  const [password, setPassword] = useState("");

  if (state.status === "success") {
    return (
      <div className="surface-flat shadow-[var(--shadow-elevated)] p-5 text-center sm:p-6">
        <h2 className="text-base font-semibold">Password changed</h2>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          {state.message}
        </p>
        <Button asChild className="mt-5 w-full">
          <Link href="/login">Go to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="surface-flat shadow-[var(--shadow-elevated)] p-5 sm:p-6">
      <div className="mb-4 space-y-1">
        <h2 className="text-base font-semibold">Choose a new password</h2>
        <p className="text-muted-foreground text-sm">
          Use a password you have not used before. Other devices will be signed out.
        </p>
      </div>

      <form action={formAction} className="space-y-4" noValidate>
        <input type="hidden" name="token" value={token} />

        <FormMessage state={state} />

        <Field label="New password" error={state.fieldErrors?.password} required>
          {(props) => (
            <Input
              {...props}
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoFocus
            />
          )}
        </Field>

        <PasswordStrength value={password} />

        <Field
          label="Type it again"
          error={state.fieldErrors?.confirmPassword}
          hint="Both entries must match exactly."
          required
        >
          {(props) => (
            <Input
              {...props}
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
            />
          )}
        </Field>

        <SubmitButton className="w-full" pendingLabel="Saving your password…">
          Save new password
        </SubmitButton>
      </form>
    </div>
  );
}
