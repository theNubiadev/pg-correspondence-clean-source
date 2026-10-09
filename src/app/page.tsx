import { redirect } from "next/navigation";

/**
 * There is no public landing page: this is an internal tool. The middleware has
 * already decided whether the visitor holds a session, so the root simply hands
 * off to the dashboard (or, for an anonymous visitor, to sign-in).
 */
export default function RootPage() {
  redirect("/dashboard");
}
