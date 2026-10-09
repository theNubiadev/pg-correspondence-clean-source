"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

/**
 * One-shot toasts driven by dashboard query flags after server-action redirects.
 * Clears the flag from the URL so refresh does not repeat the toast.
 */
export function ActionFlashToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    const logged = searchParams.get("logged");
    const dispatched = searchParams.get("dispatched");
    const closed = searchParams.get("closed");
    const key = logged
      ? `logged:${logged}`
      : dispatched
        ? `dispatched:${dispatched}`
        : closed
          ? `closed:${closed}`
          : null;

    if (!key || handled.current === key) return;
    handled.current = key;

    if (logged) {
      toast.success(
        logged === "1"
          ? "Correspondence logged successfully."
          : `Correspondence ${logged} logged successfully.`,
      );
    } else if (dispatched) {
      toast.success("Correspondence dispatched successfully.");
    } else if (closed) {
      toast.success("Correspondence closed successfully.");
    }

    const next = new URLSearchParams(searchParams.toString());
    next.delete("logged");
    next.delete("dispatched");
    next.delete("closed");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, router, pathname]);

  return null;
}
