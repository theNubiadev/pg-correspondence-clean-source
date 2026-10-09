"use client";

import { Check, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { assessPassword, PASSWORD_RULES } from "@/lib/auth/password-policy";

const BAR_TONES = [
  "bg-destructive",
  "bg-destructive",
  "bg-warning",
  "bg-success",
  "bg-success",
] as const;

/**
 * Shows the requirements as a checklist rather than only a coloured bar. A bar
 * alone tells someone their password is "weak" without telling them what to do
 * about it, and colour alone is not accessible.
 */
export function PasswordStrength({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const { score, label } = assessPassword(value);
  const filled = value.length === 0 ? 0 : score + 1;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <div
          className="flex flex-1 gap-1"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={5}
          aria-valuenow={filled}
          aria-label="Password strength"
        >
          {[0, 1, 2, 3, 4].map((index) => (
            <span
              key={index}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors duration-300",
                index < filled ? BAR_TONES[score] : "bg-muted",
              )}
            />
          ))}
        </div>
        <span className="text-muted-foreground w-20 shrink-0 text-right text-xs font-medium">
          {value.length === 0 ? "" : label}
        </span>
      </div>

      <ul className="grid gap-1.5 sm:grid-cols-2">
        {PASSWORD_RULES.map((rule) => {
          const passed = rule.test(value);
          return (
            <li
              key={rule.id}
              className={cn(
                "flex items-center gap-1.5 text-xs transition-colors",
                passed ? "text-success" : "text-muted-foreground",
              )}
            >
              {passed ? (
                <Check className="size-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <X className="size-3.5 shrink-0 opacity-40" aria-hidden="true" />
              )}
              <span>{rule.label}</span>
              <span className="sr-only">{passed ? " — met" : " — not yet met"}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
