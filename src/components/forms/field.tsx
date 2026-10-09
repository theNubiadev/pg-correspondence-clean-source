"use client";

import { useId } from "react";
import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

/**
 * A labelled form row.
 *
 * The wiring here is what makes the forms usable by someone who has never met a
 * web app: every control has a visible label, an optional plain-English hint,
 * and — when something is wrong — a message directly beneath it rather than a
 * summary banner at the top of the page. `aria-describedby` and
 * `aria-invalid` are set for screen readers, and the required marker is
 * announced rather than being a decorative asterisk.
 */
export function Field({
  label,
  hint,
  error,
  required,
  optional,
  className,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string[] | string;
  required?: boolean;
  optional?: boolean;
  className?: string;
  htmlFor?: string;
  children: (props: {
    id: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
    "aria-required"?: boolean;
  }) => React.ReactNode;
}) {
  const generatedId = useId();
  const id = htmlFor ?? generatedId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const messages = Array.isArray(error) ? error : error ? [error] : [];
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id} className="text-[0.8125rem] font-medium">
          {label}
          {required ? (
            <span className="text-destructive ml-0.5" aria-hidden="true">
              *
            </span>
          ) : null}
          {required ? <span className="sr-only"> (required)</span> : null}
        </Label>
        {optional ? (
          <span className="text-muted-foreground text-xs">Optional</span>
        ) : null}
      </div>

      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": messages.length > 0 || undefined,
        "aria-required": required || undefined,
      })}

      {hint && messages.length === 0 ? (
        <p id={hintId} className="text-muted-foreground text-xs leading-relaxed">
          {hint}
        </p>
      ) : null}

      {messages.length > 0 ? (
        <p
          id={errorId}
          className="text-destructive flex items-start gap-1.5 text-xs font-medium"
        >
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          <span>{messages[0]}</span>
        </p>
      ) : null}
    </div>
  );
}

/** Groups related fields under a heading, the way a paper form is sectioned. */
export function FieldGroup({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-5", className)}>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">{title}</h3>
        {description ? (
          <p className="text-muted-foreground text-xs leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
