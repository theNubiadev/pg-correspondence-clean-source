/**
 * The password policy, kept free of Node built-ins so the strength meter can
 * import it in the browser and the Zod schema can import it on the server. One
 * definition, so the rule the user is shown is the rule that is enforced.
 */

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  /** Outstanding requirements, phrased as instructions. */
  issues: string[];
};

export const PASSWORD_RULES = [
  {
    id: "length",
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (value: string) => value.length >= PASSWORD_MIN_LENGTH,
    issue: `Use at least ${PASSWORD_MIN_LENGTH} characters`,
  },
  {
    id: "upper",
    label: "One capital letter",
    test: (value: string) => /[A-Z]/.test(value),
    issue: "Add a capital letter",
  },
  {
    id: "lower",
    label: "One small letter",
    test: (value: string) => /[a-z]/.test(value),
    issue: "Add a small letter",
  },
  {
    id: "number",
    label: "One number",
    test: (value: string) => /[0-9]/.test(value),
    issue: "Add a number",
  },
  {
    id: "symbol",
    label: "One symbol, such as ! or @",
    test: (value: string) => /[^A-Za-z0-9]/.test(value),
    issue: "Add a symbol, such as ! or @",
  },
] as const;

const LABELS = ["Very weak", "Weak", "Fair", "Strong", "Very strong"] as const;

export function assessPassword(value: string): PasswordStrength {
  const issues = PASSWORD_RULES.filter((rule) => !rule.test(value)).map(
    (rule) => rule.issue,
  );
  const passed = PASSWORD_RULES.length - issues.length;
  const score = Math.max(
    0,
    Math.min(4, passed - 1),
  ) as PasswordStrength["score"];

  return { score, label: LABELS[score], issues };
}
