import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Crest } from "@/components/brand/crest";
import { ORG_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Access denied",
  robots: { index: false, follow: false },
};

export default function ForbiddenPage() {
  return (
    <div className="brand-wash flex min-h-full flex-col items-center justify-center px-4 py-16">
      <div className="surface mx-auto w-full max-w-md p-8 text-center">
        <Crest className="mx-auto size-12 opacity-90" />

        <div className="bg-destructive/10 text-destructive mx-auto mt-6 flex size-14 items-center justify-center rounded-full text-xl font-semibold">
          !
        </div>

        <h1 className="mt-6 text-xl font-semibold tracking-[-0.02em]">
          You do not have permission
        </h1>

        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          Your account is signed in, but it is not allowed to open the page you
          asked for. If you believe this is a mistake, speak to the registry
          office or the ICT unit at {ORG_NAME}.
        </p>

        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/dashboard">Back to overview</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/settings/profile">My profile</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
