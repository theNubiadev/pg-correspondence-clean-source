"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Match device", icon: Monitor },
] as const;

/**
 * A three-way segmented control rather than a toggle, so "follow my device"
 * is a visible choice instead of hidden behaviour.
 *
 * Rendering is deferred until mounted because the resolved theme is not known
 * during SSR; a placeholder of the same size prevents layout shift.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        className={cn("bg-muted/60 h-8 w-[6.75rem] rounded-lg", className)}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn(
        "bg-muted/70 inline-flex items-center gap-0.5 rounded-lg p-0.5",
        className,
      )}
    >
      {OPTIONS.map((option) => {
        const selected = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            title={option.label}
            onClick={() => setTheme(option.value)}
            className={cn(
              "focus-visible:ring-ring/45 flex size-7 items-center justify-center rounded-[7px] transition-colors focus-visible:ring-[3px] focus-visible:outline-none",
              selected
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <option.icon className="size-4" aria-hidden="true" />
            <span className="sr-only">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
