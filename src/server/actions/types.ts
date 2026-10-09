import type { z } from "zod";

/**
 * The shape every Server Action returns.
 *
 * Using one envelope means forms bind to `useActionState` identically across
 * the app, and field-level errors from Zod surface next to the right input
 * without each form inventing its own error plumbing.
 */
export type ActionState<TData = undefined> = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
  data?: TData;
};

export const idleState: ActionState = { status: "idle" };

export function actionSuccess<T>(
  message: string,
  data?: T,
): ActionState<T> {
  return { status: "success", message, data };
}

export function actionError(
  message: string,
  fieldErrors?: Record<string, string[]>,
): ActionState<never> {
  return { status: "error", message, fieldErrors };
}

/** Flattens a Zod failure into the envelope, keeping the first message per field. */
export function actionErrorFromZod(
  error: z.ZodError,
  message = "Please correct the highlighted fields.",
): ActionState<never> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
  }
  return { status: "error", message, fieldErrors };
}

/**
 * Converts a thrown error into a message safe to show a user.
 *
 * Domain errors (workflow, permission, validation) carry text written for the
 * registry, so they pass through. Anything else is replaced with a generic line
 * and logged, so a stack trace or SQL fragment never reaches the browser.
 */
const SAFE_ERROR_NAMES = new Set([
  "WorkflowError",
  "ForbiddenError",
  "UnauthenticatedError",
]);

/** Next.js `redirect()` / `notFound()` must not be swallowed by action catch blocks. */
export function rethrowNextNavigation(error: unknown): void {
  if (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    String((error as { digest: string }).digest).startsWith("NEXT_")
  ) {
    throw error;
  }
}

export function toActionError(error: unknown): ActionState<never> {
  rethrowNextNavigation(error);
  if (error instanceof Error && SAFE_ERROR_NAMES.has(error.name)) {
    return actionError(error.message);
  }
  console.error("[action] unhandled failure", error);
  return actionError(
    "Something went wrong on our side. Please try again, and tell ICT if it keeps happening.",
  );
}

/** Reads a checkbox from FormData, tolerating both "on" and "true". */
export function formBoolean(value: FormDataEntryValue | null): boolean {
  return value === "on" || value === "true" || value === "1";
}

/** Normalises FormData into a plain object for Zod, dropping empty strings. */
export function formToObject(formData: FormData): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) continue;
    const existing = output[key];
    if (existing === undefined) {
      output[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      output[key] = [existing, value];
    }
  }
  return output;
}
