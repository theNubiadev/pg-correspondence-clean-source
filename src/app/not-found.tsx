import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Crest } from "@/components/brand/crest";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Crest className="mx-auto mb-4 size-10 opacity-80" />
        <EmptyState
          title="Page not found"
          description="That address is not part of the correspondence register."
          action={
            <Button asChild>
              <Link href="/dashboard">Back to overview</Link>
            </Button>
          }
        />
      </div>
    </div>
  );
}
