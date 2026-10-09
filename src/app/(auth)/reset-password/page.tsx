import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Choose a new password",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="surface shadow-[var(--shadow-elevated)] p-7 text-center sm:p-8">
        <span className="bg-destructive/8 text-destructive mx-auto mb-5 inline-flex size-11 items-center justify-center rounded-md text-lg font-semibold">
          !
        </span>
        <h1 className="text-lg font-semibold">This link is incomplete</h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          The reset link is missing its security code. Open the most recent email
          we sent you, or request a new link.
        </p>
        <Button asChild className="mt-6 w-full">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }

  return <ResetPasswordForm token={token} />;
}
