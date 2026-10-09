"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { Info, Save, UserRound } from "lucide-react";
import type { ApplicantType, CorrespondenceStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldGroup } from "@/components/forms/field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { FACULTIES, departmentsFor } from "@/lib/academic";
import { APPLICANT_TYPE_META } from "@/lib/constants";
import { toDateInputValue } from "@/lib/format";
import {
  createCorrespondenceAction,
  updateCorrespondenceAction,
} from "@/server/actions/correspondence";
import { idleState } from "@/server/actions/types";

export type CorrespondenceFormDefaults = {
  id?: string;
  applicantType?: ApplicantType;
  studentName?: string;
  onBehalfOf?: string | null;
  addresseeName?: string | null;
  batchNumber?: string | null;
  matricNumber?: string;
  faculty?: string;
  department?: string;
  staffId?: string | null;
  subject?: string;
  remarks?: string | null;
  dateReceived?: Date;
  status?: CorrespondenceStatus;
};

export function CorrespondenceForm({
  mode,
  defaults,
}: {
  mode: "create" | "edit";
  defaults?: CorrespondenceFormDefaults;
}) {
  const [state, formAction] = useActionState(
    (mode === "create"
      ? createCorrespondenceAction
      : updateCorrespondenceAction) as (
      prev: typeof idleState,
      formData: FormData,
    ) => Promise<typeof idleState>,
    idleState,
  );
  const [applicantType, setApplicantType] = useState<ApplicantType>(
    defaults?.applicantType ?? "STUDENT",
  );
  const [faculty, setFaculty] = useState(defaults?.faculty ?? "");

  const errors = state.fieldErrors ?? {};
  const meta = APPLICANT_TYPE_META[applicantType];
  const facultyOptions = useMemo(() => {
    if (faculty && !(FACULTIES as readonly string[]).includes(faculty)) {
      return [faculty, ...FACULTIES];
    }
    return FACULTIES;
  }, [faculty]);
  const departmentOptions = useMemo(() => {
    const listed = [...departmentsFor(faculty || undefined)];
    if (defaults?.department && !listed.includes(defaults.department)) {
      listed.unshift(defaults.department);
    }
    return listed;
  }, [faculty, defaults?.department]);

  return (
    <form
      action={formAction}
      className="mx-auto max-w-3xl space-y-6"
      noValidate
    >
      {mode === "edit" && defaults?.id ? (
        <input type="hidden" name="id" value={defaults.id} />
      ) : null}

      <FormMessage state={state} />

      <section className="surface space-y-6 p-5 sm:p-6">
        <FieldGroup
          title="Letter identity"
          description="Who wrote or presented the letter, and what kind of mail it is."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Mail type" error={errors.applicantType} required>
              {(props) => (
                <NativeSelect
                  {...props}
                  name="applicantType"
                  value={applicantType}
                  onChange={(event) =>
                    setApplicantType(event.target.value as ApplicantType)
                  }
                >
                  <option value="STUDENT">{APPLICANT_TYPE_META.STUDENT.label}</option>
                  <option value="STAFF">{APPLICANT_TYPE_META.STAFF.label}</option>
                  <option value="UNIT">{APPLICANT_TYPE_META.UNIT.label}</option>
                  <option value="EXTERNAL">{APPLICANT_TYPE_META.EXTERNAL.label}</option>
                  <option value="OTHERS">{APPLICANT_TYPE_META.OTHERS.label}</option>
                </NativeSelect>
              )}
            </Field>

            <Field
              label={meta.nameLabel}
              error={errors.studentName}
              required
              className="sm:col-span-2"
              hint="The person or desk named as author of the letter."
            >
              {(props) => (
                <Input
                  {...props}
                  name="studentName"
                  defaultValue={defaults?.studentName}
                  placeholder="Full name as written on the letter"
                />
              )}
            </Field>

            <Field
              label="On behalf of / bearer"
              error={errors.onBehalfOf}
              optional
              className="sm:col-span-2"
              hint="Use when someone else brought or presented the letter for the writer."
            >
              {(props) => (
                <Input
                  {...props}
                  name="onBehalfOf"
                  defaultValue={defaults?.onBehalfOf ?? ""}
                  placeholder="Optional — bearer or presenter"
                />
              )}
            </Field>

            <Field
              label="Written to (person)"
              error={errors.addresseeName}
              optional
              className="sm:col-span-2"
              hint="Use when the letter is addressed to a person, not only to a unit."
            >
              {(props) => (
                <Input
                  {...props}
                  name="addresseeName"
                  defaultValue={defaults?.addresseeName ?? ""}
                  placeholder="Person named on the letter"
                />
              )}
            </Field>

            <Field
              label="Batch number"
              error={errors.batchNumber}
              optional
              hint="Groups letters logged together — for example FIN-2026-09-22."
            >
              {(props) => (
                <Input
                  {...props}
                  name="batchNumber"
                  defaultValue={defaults?.batchNumber ?? ""}
                  className="font-mono"
                  placeholder="Batch number"
                />
              )}
            </Field>

            {applicantType === "STAFF" ? (
              <>
                <Field
                  label={meta.idLabel ?? "Staff ID"}
                  error={errors.staffId}
                  optional
                >
                  {(props) => (
                    <Input
                      {...props}
                      name="staffId"
                      defaultValue={defaults?.staffId ?? ""}
                      className="font-mono"
                      placeholder="Staff ID"
                    />
                  )}
                </Field>
                <input type="hidden" name="matricNumber" value={defaults?.matricNumber ?? ""} />
              </>
            ) : (
              <>
                <input type="hidden" name="matricNumber" value={defaults?.matricNumber ?? ""} />
                <input type="hidden" name="staffId" value="" />
              </>
            )}

            <Field label="Faculty" error={errors.faculty} optional>
              {(props) => (
                <NativeSelect
                  {...props}
                  name="faculty"
                  value={faculty}
                  onChange={(event) => setFaculty(event.target.value)}
                >
                  <option value="">Not stated</option>
                  {facultyOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </Field>

            <Field label="Department" error={errors.department} optional>
              {(props) => (
                <NativeSelect
                  {...props}
                  name="department"
                  defaultValue={defaults?.department ?? ""}
                  disabled={!faculty}
                >
                  <option value="">
                    {faculty ? "Select department" : "Choose a faculty first"}
                  </option>
                  {departmentOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </Field>
          </div>
        </FieldGroup>

        <FieldGroup title="Correspondence">
          <Field
            label="Subject / letter title"
            error={errors.subject}
            required
            hint="The title of the letter — what it is about."
          >
            {(props) => (
              <Textarea
                {...props}
                name="subject"
                defaultValue={defaults?.subject}
                rows={3}
                className="resize-y"
              />
            )}
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Date received" error={errors.dateReceived} required>
              {(props) => (
                <Input
                  {...props}
                  name="dateReceived"
                  type="date"
                  defaultValue={toDateInputValue(
                    defaults?.dateReceived ?? new Date(),
                  )}
                  max={toDateInputValue(new Date())}
                />
              )}
            </Field>

            {mode === "create" ? (
              <input type="hidden" name="status" value="AWAITING_PROVOST_ACTION" />
            ) : null}
          </div>

          <Field
            label="Remarks"
            error={errors.remarks}
            optional
            hint="Optional extra context only — not the letter title."
          >
            {(props) => (
              <Textarea
                {...props}
                name="remarks"
                defaultValue={defaults?.remarks ?? ""}
                rows={3}
                className="resize-y"
              />
            )}
          </Field>
        </FieldGroup>
      </section>

      <section className="surface space-y-6 p-5 sm:p-6">
        <FieldGroup
          title="Letter scan"
          description="Scan or photograph the letter so the virtual record carries a copy. On a phone, you can use the camera; on a PC, choose a file from your scanner or folder."
        >
          <Field
            label="Scan / photo of the letter"
            optional
            hint="PDF or image (JPEG, PNG, WebP, GIF), up to 12 MB. This is the letter scan — not a separate scanner module."
          >
            {(props) => (
              <Input
                {...props}
                name="attachment"
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp,image/gif"
                capture="environment"
              />
            )}
          </Field>
        </FieldGroup>
      </section>

      <aside className="border-border bg-muted/40 flex gap-3 rounded-md border p-4">
        <Info className="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div className="space-y-1 text-xs leading-relaxed">
          <p className="font-medium">
            {mode === "create"
              ? "Routing is captured at dispatch"
              : "Edit letter details only"}
          </p>
          <p className="text-muted-foreground">
            {mode === "create"
              ? "Log the letter first. Destination and date leaving the office are recorded when the letter is dispatched. You can attach another copy at dispatch."
              : "To route this letter, advance it to Provost has attended and complete the dispatch page."}
          </p>
        </div>
      </aside>

      <div className="bg-background sticky bottom-0 flex flex-wrap items-center justify-end gap-3 border-t py-4">
        <Button asChild variant="ghost">
          <Link
            href={
              mode === "edit" && defaults?.id
                ? `/correspondence/${defaults.id}`
                : "/dashboard"
            }
          >
            Cancel
          </Link>
        </Button>
        <SubmitButton
          pendingLabel={mode === "create" ? "Logging…" : "Saving…"}
          icon={
            mode === "create" ? (
              <UserRound className="size-4" aria-hidden="true" />
            ) : (
              <Save className="size-4" aria-hidden="true" />
            )
          }
        >
          {mode === "create" ? "Log correspondence" : "Save changes"}
        </SubmitButton>
      </div>
    </form>
  );
}
