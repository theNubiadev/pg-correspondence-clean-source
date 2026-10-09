import Image from "next/image";

import { cn } from "@/lib/utils";
import { ORG_MOTTO, ORG_SHORT_NAME } from "@/lib/constants";

/**
 * The institutional crest.
 *
 * The asset is the official mark taken from the Postgraduate College site. It
 * is served at three sizes so the sidebar does not download a 1024px image for
 * a 32px slot. To swap in an updated mark, replace the files in
 * `public/brand/` — no code change is needed.
 */

const SOURCES = {
  sm: "/brand/pg-college-crest-96.png",
  md: "/brand/pg-college-crest-256.png",
  lg: "/brand/pg-college-crest.png",
} as const;

const DIMENSIONS = {
  sm: { width: 96, height: 88 },
  md: { width: 256, height: 235 },
  lg: { width: 1024, height: 940 },
} as const;

export function Crest({
  size = "sm",
  className,
  priority = false,
}: {
  size?: keyof typeof SOURCES;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={SOURCES[size]}
      alt={`${ORG_SHORT_NAME} crest`}
      width={DIMENSIONS[size].width}
      height={DIMENSIONS[size].height}
      className={cn("h-8 w-auto select-none", className)}
      priority={priority}
      draggable={false}
    />
  );
}

/**
 * Crest plus institution name. Used in the sidebar, the sign-in card and the
 * print header of every exported report, so the branding is identical wherever
 * the system is seen.
 */
export function Wordmark({
  className,
  showMotto = false,
  size = "sm",
  subtitle = "Correspondence Register",
  compact = false,
}: {
  className?: string;
  showMotto?: boolean;
  size?: "sm" | "lg";
  subtitle?: string;
  compact?: boolean;
}) {
  const markSize = compact || size === "sm" ? "sm" : "md";

  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <Crest
        size={markSize === "md" || size === "lg" ? "md" : "sm"}
        className={
          size === "lg" || markSize === "md" ? "h-12 w-auto" : "h-9 w-auto"
        }
        priority={size === "lg"}
      />
      <div className="min-w-0 leading-tight">
        <p
          className={cn(
            "truncate font-semibold tracking-[-0.01em]",
            size === "lg" ? "text-base" : "text-[0.9375rem]",
          )}
        >
          {ORG_SHORT_NAME}
        </p>
        <p
          className={cn(
            "text-muted-foreground truncate",
            size === "lg" ? "text-sm" : "text-xs",
          )}
        >
          {showMotto ? ORG_MOTTO : subtitle}
        </p>
      </div>
    </div>
  );
}

export function Motto({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "text-muted-foreground text-center text-xs tracking-[0.08em] uppercase",
        className,
      )}
    >
      {ORG_MOTTO}
    </p>
  );
}
