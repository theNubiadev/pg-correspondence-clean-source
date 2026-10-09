import { z } from "zod";

import { isKnownUniversityType } from "@/lib/auth/university-types";
import { emailSchema, passwordSchema } from "@/lib/validations/auth";

const usernameSchema = z
  .string()
  .trim()
  .min(2, "Enter a username")
  .max(40)
  .regex(
    /^[a-zA-Z0-9._-]+$/,
    "Use letters, numbers, dots, underscores and hyphens",
  )
  .transform((value) => value.toLowerCase());

const userTypeSchema = z
  .string()
  .trim()
  .min(1, "Select a university user_type")
  .transform((value) => value.toLowerCase())
  .refine(isKnownUniversityType, "Unknown university user_type code");

/** University-shaped staff account: username, pass, user_type (+ optional display). */
export const createUserSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  userType: userTypeSchema,
  fullName: z
    .union([z.string(), z.undefined()])
    .transform((value) => {
      const trimmed = (value ?? "").trim();
      return trimmed.length ? trimmed : undefined;
    })
    .pipe(z.string().min(2).max(160).optional()),
  email: z
    .union([z.string(), z.undefined()])
    .transform((value) => {
      const trimmed = (value ?? "").trim();
      return trimmed.length ? trimmed : undefined;
    })
    .pipe(emailSchema.optional()),
});

export const updateUserSchema = z.object({
  id: z.string().min(1),
  username: usernameSchema,
  userType: userTypeSchema,
  fullName: z
    .union([z.string(), z.undefined()])
    .transform((value) => {
      const trimmed = (value ?? "").trim();
      return trimmed.length ? trimmed : undefined;
    })
    .pipe(z.string().min(2).max(160).optional()),
  email: z
    .union([z.string(), z.undefined()])
    .transform((value) => {
      const trimmed = (value ?? "").trim();
      return trimmed.length ? trimmed : undefined;
    })
    .pipe(emailSchema.optional()),
});

export const resetPasswordSchema = z.object({
  id: z.string().min(1),
  password: passwordSchema,
});

export const destinationOfficeSchema = z.object({
  officeName: z.string().trim().min(2, "Enter an office name").max(120),
});

export const updateDestinationOfficeSchema = destinationOfficeSchema.extend({
  id: z.string().min(1),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const settingsSchema = z.object({
  universityName: z.string().trim().min(2).max(160),
  pgSchoolName: z.string().trim().min(2).max(160),
});

export type SettingsValues = z.infer<typeof settingsSchema>;

export const reportRequestSchema = z
  .object({
    period: z
      .enum(["daily", "weekly", "monthly", "yearly", "custom"])
      .default("monthly"),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    format: z.enum(["pdf", "xlsx"]).default("xlsx"),
  })
  .superRefine((values, ctx) => {
    if (values.period !== "custom") return;
    if (!values.from || !values.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["from"],
        message: "Choose a start and end date",
      });
      return;
    }
    if (values.from > values.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["to"],
        message: "The end date must be on or after the start date",
      });
    }
  });

export type ReportRequest = z.infer<typeof reportRequestSchema>;
