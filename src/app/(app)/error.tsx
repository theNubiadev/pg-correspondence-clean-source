"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <ErrorState
          title="This page could not be loaded"
          description="Try again. Your work on other pages is unchanged."
          action={
            <div className="flex gap-2">
              <Button type="button" onClick={reset}>
                Retry
              </Button>
              <Button asChild variant="outline">
                <a href="/dashboard">Overview</a>
              </Button>
            </div>
          }
        />
      </div>
    </div>
  );
}
