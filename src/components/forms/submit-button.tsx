"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * A submit button that disables itself and says what it is doing while the
 * Server Action runs. Double submission is a real hazard on a registry desk
 * with a slow connection — a second click must never create a second record.
 */
export function SubmitButton({
  children,
  pendingLabel,
  className,
  variant,
  size,
  disabled,
  icon,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      disabled={pending || disabled}
      aria-busy={pending}
      className={cn("gap-2", className)}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        icon
      )}
      <span>{pending ? (pendingLabel ?? "Working…") : children}</span>
    </Button>
  );
}
