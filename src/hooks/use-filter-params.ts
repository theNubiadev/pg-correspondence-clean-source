"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Keeps register filters in the URL rather than in component state.
 *
 * That is what makes a filtered view shareable — an officer can send a
 * colleague "everything overdue in Finance" as a link, and the back button
 * behaves the way people expect. Changing any filter also resets to page one,
 * because staying on page 7 of a narrower result set is never what was meant.
 */
export function useFilterParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const setParams = useCallback(
    (
      updates: Record<string, string | string[] | null | undefined>,
      options?: { resetPage?: boolean },
    ) => {
      const next = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (
          value === null ||
          value === undefined ||
          value === "" ||
          (Array.isArray(value) && value.length === 0)
        ) {
          next.delete(key);
        } else {
          next.set(key, Array.isArray(value) ? value.join(",") : value);
        }
      }

      if (options?.resetPage !== false && !("page" in updates)) {
        next.delete("page");
      }

      const query = next.toString();
      startTransition(() => {
        router.push(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router, searchParams],
  );

  const getList = useCallback(
    (key: string): string[] => {
      const raw = searchParams.get(key);
      return raw ? raw.split(",").filter(Boolean) : [];
    },
    [searchParams],
  );

  const toggleInList = useCallback(
    (key: string, value: string) => {
      const current = getList(key);
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      setParams({ [key]: next });
    },
    [getList, setParams],
  );

  const clearAll = useCallback(() => {
    startTransition(() => router.push(pathname, { scroll: false }));
  }, [pathname, router]);

  return {
    searchParams,
    setParams,
    getList,
    toggleInList,
    clearAll,
    isPending,
    get: (key: string) => searchParams.get(key),
  };
}
