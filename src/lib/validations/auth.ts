import { z } from "zod";

import {
  assessPassword,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/lib/auth/password-policy";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email address is required")
  .email("Enter a valid email address")
  .max(255)
  .toLowerCase();

/**
 * One password policy, shared by the sign-in, reset and user-management forms.
 * The message list comes from `assessPassword` so the strength meter and the
 * server-side rejection can never disagree.
 */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, "That password is too long")
  .superRefine((value, ctx) => {
    for (const issue of assessPassword(value).issues) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: issue });
    }
  });

/**
 * University-style login: staff username (e.g. olu, finance).
 * Pasting an email still works as a fallback for seeded admin/provost accounts.
 */
export const loginIdentifierSchema = z
  .string()
  .trim()
  .min(1, "Enter your username")
  .max(255);

export const loginSchema = z.object({
  username: loginIdentifierSchema,
  password: z.string().min(1, "Enter your password"),
  rememberDevice: z.preprocess(
    (value) => value === true || value === "on" || value === "true" || value === "1",
    z.boolean(),
  ),
  next: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20, "This reset link is not valid"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Both passwords must match",
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Both passwords must match",
  })
  .refine((data) => data.currentPassword !== data.password, {
    path: ["password"],
    message: "Choose a password you have not used before",
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
