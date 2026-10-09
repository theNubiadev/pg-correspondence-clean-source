import { z } from "zod";

import { FACULTIES } from "@/lib/academic";
import { CORRESPONDENCE_STATUSES, CREATE_STATUSES } from "@/lib/constants";
import { REGISTER_VIEW_KEYS } from "@/lib/register-views";

export const statusSchema = z.enum(
  CORRESPONDENCE_STATUSES as [string, ...string[]],
);

export const createStatusSchema = z.enum(
  CREATE_STATUSES as [string, ...string[]],
);

export const actionCommentSchema = z
  .string()
  .trim()
  .max(5000, "That comment is too long")
  .optional()
  .default("");

export const mailTypeSchema = z.enum([
  "STUDENT",
  "STAFF",
  "UNIT",
  "EXTERNAL",
  "OTHERS",
]);

const emptyToNull = (value: unknown) =>
  value === "" || value === undefined ? null : value;

const applicantFields = z.object({
  studentName: z
    .string()
    .trim()
    .min(3, "Enter the letter writer / originator")
    .max(160),
  applicantType: mailTypeSchema.default("STUDENT"),
  onBehalfOf: z.preprocess(
    emptyToNull,
    z.string().trim().max(160).nullable().optional(),
  ),
  addresseeName: z.preprocess(
    emptyToNull,
    z.string().trim().max(160).nullable().optional(),
  ),
  batchNumber: z.preprocess(
    emptyToNull,
    z.string().trim().max(64).nullable().optional(),
  ),
  subject: z
    .string()
    .trim()
    .min(5, "Give the letter a clear title / subject")
    .max(500),
  matricNumber: z.string().trim().max(32).optional().default(""),
  faculty: z
    .string()
    .trim()
    .refine((value) => !value || (FACULTIES as readonly string[]).includes(value), {
      message: "Choose a faculty from the list",
    })
    .optional()
    .default(""),
  department: z.string().trim().max(120).optional().default(""),
  staffId: z.preprocess(
    emptyToNull,
    z.string().trim().max(64).nullable().optional(),
  ),
  remarks: z.preprocess(
    emptyToNull,
    z
      .string()
      .trim()
      .max(5000, "That remark is too long")
      .nullable()
      .optional(),
  ),
  dateReceived: z.coerce
    .date({ invalid_type_error: "Choose the date it was received" })
    .max(
      new Date(Date.now() + 24 * 60 * 60 * 1000),
      "The received date cannot be in the future",
    ),
});

function checkSentAfterReceived(
  values: { dateReceived: Date; dateSentToOffice: Date | null },
  ctx: z.RefinementCtx,
) {
  if (
    values.dateSentToOffice &&
    values.dateSentToOffice < values.dateReceived
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["dateSentToOffice"],
      message: "It cannot leave before the date it was received",
    });
  }
}

/** First log: writer details + date received + status. No routing yet. */
export const createCorrespondenceSchema = applicantFields.extend({
  status: createStatusSchema.default("AWAITING_PROVOST_ACTION"),
});

/** Edit writer details (routing is handled on dispatch). */
export const updateCorrespondenceSchema = applicantFields.extend({
  id: z.string().min(1),
  comment: actionCommentSchema,
  dateSentToOffice: z.preprocess(
    emptyToNull,
    z.coerce
      .date({ invalid_type_error: "Choose a valid date" })
      .nullable(),
  ),
  destinationOfficeId: z.preprocess(
    emptyToNull,
    z.string().min(1).nullable().optional(),
  ),
});

/** Routing step when moving to Dispatched. */
export const dispatchCorrespondenceSchema = z
  .object({
    id: z.string().min(1),
    destinationOfficeId: z.preprocess(
      (value) => (value === "" || value === undefined || value === "__other__" ? "" : value),
      z.string().optional().default(""),
    ),
    customDestination: z.preprocess(
      (value) => (value === "" || value === undefined ? "" : value),
      z.string().trim().max(160).optional().default(""),
    ),
    dateSentToOffice: z.coerce.date({
      invalid_type_error: "Choose the date leaving the office",
    }),
    comment: actionCommentSchema,
    dateReceived: z.coerce.date().optional(),
  })
  .superRefine((values, ctx) => {
    const hasListed = Boolean(values.destinationOfficeId?.trim());
    const hasCustom = Boolean(values.customDestination?.trim());
    if (!hasListed && !hasCustom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["destinationOfficeId"],
        message: "Choose a destination unit or type one outside the college",
      });
    }
    if (values.dateReceived) {
      checkSentAfterReceived(
        {
          dateReceived: values.dateReceived,
          dateSentToOffice: values.dateSentToOffice,
        },
        ctx,
      );
    }
  });

export const statusUpdateSchema = z.object({
  id: z.string().min(1),
  status: statusSchema,
  remarks: z
    .string()
    .trim()
    .max(5000, "Remarks are too long")
    .optional()
    .nullable(),
});

export const closeCorrespondenceSchema = z.object({
  id: z.string().min(1),
  comment: actionCommentSchema,
});

export const commentedIdSchema = z.object({
  id: z.string().min(1),
  comment: actionCommentSchema,
});

/** Finance-only: optional PV / transaction key (unique when set). */
export const setFinancePvSchema = z.object({
  id: z.string().min(1),
  pvNumber: z.preprocess(
    emptyToNull,
    z
      .string()
      .trim()
      .max(64, "That PV number is too long")
      .nullable()
      .optional(),
  ),
});

export const correctStatusSchema = z.object({
  id: z.string().min(1),
  status: statusSchema,
  reason: z
    .string()
    .trim()
    .min(5, "Give a short reason for the correction")
    .max(2000),
});

export const remarksUpdateSchema = z.object({
  id: z.string().min(1),
  remarks: z
    .string()
    .trim()
    .max(5000, "Remarks are too long")
    .optional()
    .nullable(),
});

export const registerFilterSchema = z.object({
  q: z.string().trim().max(160).optional(),
  status: statusSchema.optional(),
  view: z.enum(REGISTER_VIEW_KEYS).optional(),
  destinationOfficeId: z.string().optional(),
  faculty: z.string().trim().optional(),
  department: z.string().trim().optional(),
  pvNumber: z.string().trim().max(64).optional(),
  batchNumber: z.string().trim().max(64).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  sort: z
    .enum([
      "dateReceived",
      "dateSentToOffice",
      "referenceNumber",
      "studentName",
      "status",
      "createdAt",
      "updatedAt",
    ])
    .optional()
    .default("dateReceived"),
  dir: z.enum(["asc", "desc"]).optional().default("desc"),
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(5).max(200).optional().default(25),
});

export const acknowledgeHandoffSchema = z.object({
  id: z.string().min(1),
  comment: actionCommentSchema,
});

export const flagMissingPhysicalSchema = z.object({
  id: z.string().min(1),
  comment: actionCommentSchema,
});

export const markPhysicalResentSchema = z.object({
  id: z.string().min(1),
  comment: actionCommentSchema,
});

export const orphanPhysicalSchema = z.object({
  sendingOfficeId: z.preprocess(
    emptyToNull,
    z.string().min(1).nullable().optional(),
  ),
  referenceHint: z.string().trim().max(64).optional().nullable(),
  applicantNameHint: z.string().trim().max(160).optional().nullable(),
  subjectHint: z.string().trim().max(500).optional().nullable(),
  datePhysicalReceived: z.coerce.date({
    invalid_type_error: "Choose the date the physical copy arrived",
  }),
  comment: z
    .string()
    .trim()
    .min(3, "Say briefly what is missing")
    .max(5000),
});

export const resolveOrphanSchema = z.object({
  id: z.string().min(1),
  correspondenceId: z.string().trim().optional().nullable(),
  comment: actionCommentSchema,
});

export type RegisterFilters = z.infer<typeof registerFilterSchema>;

export function parseRegisterFilters(
  params: Record<string, string | string[] | undefined>,
): RegisterFilters {
  const parsed = registerFilterSchema.safeParse(params);
  if (parsed.success) return parsed.data;
  return registerFilterSchema.parse({});
}
