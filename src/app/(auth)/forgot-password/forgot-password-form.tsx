"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Field } from "@/components/forms/field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { requestPasswordResetAction } from "@/server/actions/auth";
import { idleState } from "@/server/actions/types";

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(
    requestPasswordResetAction,
    idleState,
  );

  return (
    <div className="surface-flat shadow-[var(--shadow-elevated)] p-5 sm:p-6">
      <div className="mb-4 space-y-1">
        <h2 className="text-base font-semibold">Reset your password</h2>
        <p className="text-muted-foreground text-sm">
          Enter your staff email. The link works once and expires after one hour.
        </p>
      </div>

      <form action={formAction} className="space-y-4" noValidate>
        <FormMessage state={state} />

        <Field
          label="Staff email address"
          error={state.fieldErrors?.email}
          required
        >
          {(props) => (
            <Input
              {...props}
              name="email"
              type="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              autoFocus
            />
          )}
        </Field>

        <SubmitButton
          className="w-full"
          pendingLabel="Sending the link…"
          icon={<Send className="size-4" aria-hidden="true" />}
        >
          Send reset link
        </SubmitButton>
      </form>

      <Link
        href="/login"
        className="text-muted-foreground hover:text-foreground mt-4 inline-flex min-h-11 items-center gap-1.5 rounded text-sm focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]/45 focus-visible:outline-none"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to sign in
      </Link>
    </div>
  );
}
