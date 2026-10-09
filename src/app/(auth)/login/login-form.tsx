"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Info, LogIn } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/forms/field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { loginAction } from "@/server/actions/auth";
import { idleState } from "@/server/actions/types";

export function LoginForm({
  next,
  notice,
}: {
  next?: string;
  notice?: string;
}) {
  const [state, formAction] = useActionState(loginAction, idleState);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      setCapsLock(event.getModifierState("CapsLock"));
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, []);

  return (
    <div className="surface-flat shadow-[var(--shadow-elevated)] p-5 sm:p-6">
      <div className="mb-4 space-y-1">
        <h2 className="text-base font-semibold">Sign in</h2>
        <p className="text-muted-foreground text-sm">
          Use your staff username or university email.
        </p>
      </div>

      <form action={formAction} className="space-y-4" noValidate>
        {next ? <input type="hidden" name="next" value={next} /> : null}

        {notice ? (
          <div
            role="status"
            className="border-primary/20 bg-primary/6 flex items-start gap-2.5 rounded-md border px-3.5 py-3 text-sm"
          >
            <Info
              className="text-primary mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <p className="leading-relaxed">{notice}</p>
          </div>
        ) : null}

        <FormMessage state={state} />

        <Field label="Username" error={state.fieldErrors?.username} required>
          {(props) => (
            <Input
              {...props}
              name="username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="next"
              autoFocus
            />
          )}
        </Field>

        <Field label="Password" error={state.fieldErrors?.password} required>
          {(props) => (
            <div className="relative">
              <Input
                {...props}
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                enterKeyHint="go"
                className="pr-11"
                onKeyUp={(event) =>
                  setCapsLock(event.getModifierState("CapsLock"))
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowPassword((value) => !value)}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 size-9 -translate-y-1/2"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </Button>
            </div>
          )}
        </Field>

        {capsLock ? (
          <p className="text-caution text-xs font-medium" role="status">
            Caps Lock is on.
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <label className="text-muted-foreground flex min-h-11 cursor-pointer items-center gap-2 text-sm select-none">
            <input
              type="checkbox"
              name="rememberDevice"
              className="border-input text-primary focus-visible:ring-ring/45 size-4 rounded border accent-[var(--primary)] focus-visible:ring-[3px]"
            />
            Keep me signed in
          </label>

          <Link
            href="/forgot-password"
            className="text-primary rounded text-sm font-medium underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]/45 focus-visible:outline-none"
          >
            Forgot password?
          </Link>
        </div>

        <SubmitButton
          className="w-full"
          pendingLabel="Signing you in…"
          icon={<LogIn className="size-4" aria-hidden="true" />}
        >
          Sign in
        </SubmitButton>
      </form>

      <p className="text-muted-foreground mt-4 border-t pt-3 text-xs leading-relaxed">
        Access is recorded. Do not share your password.
      </p>
    </div>
  );
}
