import type { Metadata } from "next";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to the Postgraduate College correspondence register.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reason?: string }>;
}) {
  const { next, reason } = await searchParams;
  return (
    <LoginForm
      next={next}
      notice={
        reason === "idle"
          ? "You were signed out after 15 minutes of inactivity."
          : undefined
      }
    />
  );
}
