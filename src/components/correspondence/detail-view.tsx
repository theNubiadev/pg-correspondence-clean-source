"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bookmark, Pencil, Play, Send } from "lucide-react";
import type { CorrespondenceStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { StatusBadge } from "@/components/correspondence/status-badge";
import { NativeSelect } from "@/components/ui/native-select";
import { Field } from "@/components/forms/field";
import {
  APPLICANT_TYPE_META,
  canEnterKiv,
  CORRESPONDENCE_STATUSES,
  nextStatus,
  STATUS_META,
} from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  acknowledgeHandoffAction,
  advanceStatusAction,
  closeCorrespondenceAction,
  correctStatusAction,
  flagMissingPhysicalAction,
  markPhysicalResentAction,
  parkAsKivAction,
  resumeFromKivAction,
  setFinancePvAction,
} from "@/server/actions/correspondence";
import { idleState } from "@/server/actions/types";
import {
  displayStatusDescription,
  handoffLabel,
} from "@/lib/workflow/view-model";
import type { PhysicalReceiptState } from "@prisma/client";

type CorrespondenceDetail = {
  id: string;
  referenceNumber: string;
  applicantType: "STUDENT" | "STAFF" | "UNIT" | "EXTERNAL" | "OTHERS";
  studentName: string;
  onBehalfOf?: string | null;
  addresseeName?: string | null;
  batchNumber?: string | null;
  pvNumber?: string | null;
  matricNumber: string;
  faculty: string;
  department: string;
  staffId: string | null;
  phoneNumber: string;
  subject: string;
  remarks: string | null;
  dateReceived: Date;
  dateSentToOffice: Date | null;
  dateClosed: Date | null;
  status: CorrespondenceStatus;
  statusBeforeKiv: CorrespondenceStatus | null;
  createdAt: Date;
  updatedAt: Date;
  destinationOffice: { id: string; officeName: string } | null;
  createdBy: { id: string; fullName: string };
  attachments?: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: Date;
  }>;
};

export type MovementEvent = {
  id: string;
  type: string;
  fromStatus: CorrespondenceStatus | null;
  toStatus: CorrespondenceStatus | null;
  note: string | null;
  createdAt: Date;
  actor: { id: string; fullName: string } | null;
  fromOfficeName?: string | null;
  toOfficeName?: string | null;
};

export function CorrespondenceDetailView({
  record,
  events,
  canEdit,
  canManageFinancePv = false,
  acknowledgeAsProvostFallback = false,
  actions,
  handoff,
  returnTo = "/correspondence",
}: {
  record: CorrespondenceDetail;
  events: MovementEvent[];
  canEdit: boolean;
  canManageFinancePv?: boolean;
  /** Provost confirms delivery when destination has no unit login. */
  acknowledgeAsProvostFallback?: boolean;
  actions: {
    advance: boolean;
    dispatch: boolean;
    forward: boolean;
    parkKiv: boolean;
    resumeKiv: boolean;
    close: boolean;
    edit: boolean;
    correct: boolean;
    acknowledge: boolean;
    flagMissingPhysical: boolean;
    markResent: boolean;
  };
  progress?: unknown;
  handoff?: {
    id: string;
    state: PhysicalReceiptState;
    virtualSentAt: Date;
    note: string | null;
    toOffice?: { officeName: string } | null;
    fromOffice?: { officeName: string } | null;
  } | null;
  returnTo?: string;
}) {
  const [advanceState, advanceAction] = useActionState(
    advanceStatusAction,
    idleState,
  );
  const [kivState, kivAction] = useActionState(parkAsKivAction, idleState);
  const [resumeState, resumeAction] = useActionState(
    resumeFromKivAction,
    idleState,
  );
  const [closeState, closeAction] = useActionState(
    closeCorrespondenceAction,
    idleState,
  );
  const [correctState, correctAction] = useActionState(
    correctStatusAction,
    idleState,
  );
  const [ackState, ackAction] = useActionState(
    acknowledgeHandoffAction,
    idleState,
  );
  const [missingState, missingAction] = useActionState(
    flagMissingPhysicalAction,
    idleState,
  );
  const [resentState, resentAction] = useActionState(
    markPhysicalResentAction,
    idleState,
  );
  const [pvState, pvAction] = useActionState(setFinancePvAction, idleState);
  const [showCorrect, setShowCorrect] = useState(false);

  const upcoming = record.status === "KIV" ? null : nextStatus(record.status);
  const resumeLabel =
    record.statusBeforeKiv && record.statusBeforeKiv !== "KIV"
      ? STATUS_META[record.statusBeforeKiv].label
      : STATUS_META.AWAITING_PROVOST_ACTION.label;

  return (
    <>
      <PageHeader
        title={record.referenceNumber}
        description={record.subject}
        breadcrumbs={[
          { label: "Overview", href: "/dashboard" },
          { label: "Register", href: returnTo },
          { label: record.referenceNumber },
        ]}
        meta={
          <StatusBadge
            status={record.status}
            handoffState={handoff?.state}
          />
        }
        actions={
          canEdit && actions.edit ? (
            <Button asChild variant="outline" className="gap-2">
              <Link href={`/correspondence/${record.id}/edit`}>
                <Pencil className="size-4" />
                Edit
              </Link>
            </Button>
          ) : null
        }
      />

      <PageBody className="space-y-4">
        <section className="surface space-y-1 p-5">
          <h2 className="text-sm font-semibold">Destination</h2>
          {record.destinationOffice ? (
            <>
              <p className="text-lg font-semibold tracking-tight">
                {record.destinationOffice.officeName}
              </p>
              <p className="text-muted-foreground text-sm">
                {record.dateSentToOffice
                  ? `Sent to this unit on ${formatDate(record.dateSentToOffice)}.`
                  : "Routed to this unit."}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              Not yet dispatched. This letter is still with the Provost Office.
              The unit name appears here after it is sent.
            </p>
          )}
        </section>

        <section className="surface space-y-2 p-5">
          <h2 className="text-sm font-semibold">Current stage</h2>
          <p className="text-sm leading-relaxed">
            {displayStatusDescription(
              record.status,
              handoff?.state,
              record.destinationOffice?.officeName,
            )}
          </p>
          {handoff ? (
            <p className="text-muted-foreground text-xs">
              {handoffLabel(handoff.state)}
              {handoff.fromOffice?.officeName
                ? ` · from ${handoff.fromOffice.officeName}`
                : " · from Provost Office"}
              {handoff.toOffice?.officeName
                ? ` → ${handoff.toOffice.officeName}`
                : ""}
            </p>
          ) : record.status === "TREATED" ||
            record.status === "AWAITING_PROVOST_ACTION" ||
            record.status === "RECEIVED" ? (
            <p className="text-muted-foreground text-xs">
              Still with the Provost Office until it is dispatched.
            </p>
          ) : null}
        </section>

        {canManageFinancePv && record.status !== "CLOSED" ? (
          <section className="surface space-y-3 p-5">
            <h2 className="text-sm font-semibold">Finance PV number</h2>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Optional. One PV per transaction — Finance sets this; it is not
              filled on the Provost log form.
            </p>
            <form action={pvAction} className="space-y-3">
              <input type="hidden" name="id" value={record.id} />
              <FormMessage state={pvState} />
              <Field
                label="PV / transaction number"
                error={
                  pvState.status === "error"
                    ? pvState.fieldErrors?.pvNumber
                    : undefined
                }
                optional
              >
                {(props) => (
                  <Input
                    {...props}
                    name="pvNumber"
                    defaultValue={record.pvNumber ?? ""}
                    className="font-mono"
                    placeholder="e.g. PV/2026/000123"
                  />
                )}
              </Field>
              <SubmitButton size="sm" pendingLabel="Saving…">
                Save PV number
              </SubmitButton>
            </form>
          </section>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <section className="surface space-y-4 p-5">
            <h2 className="text-sm font-semibold">Letter</h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <DetailField
                label="Mail type"
                value={APPLICANT_TYPE_META[record.applicantType].label}
              />
              <DetailField
                label={APPLICANT_TYPE_META[record.applicantType].nameLabel}
                value={record.studentName}
              />
              <DetailField
                label="On behalf of / bearer"
                value={record.onBehalfOf}
              />
              <DetailField
                label="Written to (person)"
                value={record.addresseeName}
              />
              <DetailField label="Batch number" value={record.batchNumber} />
              {record.applicantType === "STAFF" && record.staffId ? (
                <DetailField label="Staff ID" value={record.staffId} />
              ) : null}
              <DetailField label="Faculty" value={record.faculty} />
              <DetailField label="Department" value={record.department} />
              <DetailField
                label="Date received"
                value={formatDate(record.dateReceived)}
              />
            </dl>
            {record.attachments && record.attachments.length > 0 ? (
              <div className="border-border space-y-2 border-t pt-3">
                <h3 className="text-xs font-semibold tracking-wide uppercase">
                  Letter scan / copy
                </h3>
                <ul className="space-y-1 text-sm">
                  {record.attachments.map((file) => (
                    <li key={file.id}>
                      <a
                        href={`/api/correspondence/${record.id}/attachments/${file.id}`}
                        className="text-primary underline-offset-4 hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {file.fileName}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <h2 className="pt-2 text-sm font-semibold">Routing</h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <DetailField
                label="Destination unit"
                value={
                  record.destinationOffice?.officeName ??
                  "Not yet dispatched"
                }
              />
              <DetailField
                label="Date leaving the office"
                value={
                  record.dateSentToOffice
                    ? formatDate(record.dateSentToOffice)
                    : "Not yet dispatched"
                }
              />
              <DetailField
                label="Date closed"
                value={record.dateClosed ? formatDate(record.dateClosed) : "—"}
              />
              <DetailField label="Logged by" value={record.createdBy.fullName} />
              {record.remarks ? (
                <div className="sm:col-span-2">
                  <DetailField label="Remarks" value={record.remarks} />
                </div>
              ) : null}
            </dl>
          </section>

          <section className="surface space-y-4 p-5">
            <h2 className="text-sm font-semibold">Do this next</h2>

            {actions.acknowledge ? (
              <form action={ackAction} className="space-y-3">
                <input type="hidden" name="id" value={record.id} />
                <FormMessage state={ackState} />
                <SubmitButton className="w-full" pendingLabel="Confirming…">
                  {acknowledgeAsProvostFallback
                    ? "Confirm paper delivered (no unit login)"
                    : "Confirm paper copy received"}
                </SubmitButton>
              </form>
            ) : null}

            {actions.flagMissingPhysical ? (
              <form action={missingAction} className="space-y-3">
                <input type="hidden" name="id" value={record.id} />
                <FormMessage state={missingState} />
                <SubmitButton
                  variant="outline"
                  className="w-full"
                  pendingLabel="Flagging…"
                >
                  Paper copy not received
                </SubmitButton>
              </form>
            ) : null}

            {actions.markResent ? (
              <form action={resentAction} className="space-y-3">
                <input type="hidden" name="id" value={record.id} />
                <FormMessage state={resentState} />
                <SubmitButton className="w-full" pendingLabel="Recording…">
                  Paper copy resent
                </SubmitButton>
              </form>
            ) : null}

            {actions.resumeKiv ? (
              <form action={resumeAction} className="space-y-3">
                <input type="hidden" name="id" value={record.id} />
                <FormMessage state={resumeState} />
                <SubmitButton
                  className="w-full"
                  pendingLabel="Resuming…"
                  icon={<Play className="size-4" aria-hidden="true" />}
                >
                  Resume to {resumeLabel}
                </SubmitButton>
              </form>
            ) : null}

            {actions.dispatch && upcoming === "DISPATCHED" ? (
              <Button asChild className="w-full gap-2">
                <Link href={`/correspondence/${record.id}/dispatch`}>
                  <Send className="size-4" />
                  Send to a unit
                </Link>
              </Button>
            ) : null}

            {actions.forward ? (
              <Button asChild className="w-full gap-2">
                <Link href={`/correspondence/${record.id}/dispatch`}>
                  <Send className="size-4" />
                  Send to another unit
                </Link>
              </Button>
            ) : null}

            {actions.advance && upcoming && upcoming !== "DISPATCHED" ? (
              <form action={advanceAction} className="space-y-3">
                <input type="hidden" name="id" value={record.id} />
                <FormMessage state={advanceState} />
                <SubmitButton
                  className="w-full"
                  pendingLabel="Updating…"
                  icon={<ArrowRight className="size-4" aria-hidden="true" />}
                >
                  {upcoming === "TREATED"
                    ? "Mark as attended by Provost"
                    : upcoming === "AWAITING_PROVOST_ACTION"
                      ? "Move to Needs Provost attention"
                      : `Move to ${STATUS_META[upcoming].label}`}
                </SubmitButton>
              </form>
            ) : null}

            {actions.parkKiv && canEnterKiv(record.status) ? (
              <form action={kivAction} className="space-y-3">
                <input type="hidden" name="id" value={record.id} />
                <FormMessage state={kivState} />
                <Field label="Keep in view — reason" required>
                  {(props) => (
                    <input
                      {...props}
                      name="comment"
                      required
                      minLength={3}
                      placeholder="Why park this letter?"
                      className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                    />
                  )}
                </Field>
                <SubmitButton
                  variant="outline"
                  className="w-full"
                  pendingLabel="Parking…"
                  icon={<Bookmark className="size-4" aria-hidden="true" />}
                >
                  Keep in view
                </SubmitButton>
              </form>
            ) : null}

            {actions.close ? (
              <form action={closeAction} className="space-y-3">
                <input type="hidden" name="id" value={record.id} />
                <FormMessage state={closeState} />
                <SubmitButton className="w-full" pendingLabel="Closing…">
                  Close letter
                </SubmitButton>
              </form>
            ) : null}

            {actions.correct ? (
              <div className="border-t pt-4">
                <button
                  type="button"
                  className="text-primary text-xs font-medium underline-offset-4 hover:underline"
                  onClick={() => setShowCorrect((value) => !value)}
                >
                  {showCorrect
                    ? "Hide administrative correction"
                    : "Administrative correction"}
                </button>
                {showCorrect ? (
                  <form action={correctAction} className="mt-3 space-y-3">
                    <input type="hidden" name="id" value={record.id} />
                    <FormMessage state={correctState} />
                    <p className="text-muted-foreground text-xs">
                      Current status: {STATUS_META[record.status].label}
                    </p>
                    <Field label="New status" required>
                      {(props) => (
                        <NativeSelect
                          {...props}
                          name="status"
                          defaultValue={record.status}
                        >
                          {CORRESPONDENCE_STATUSES.filter((s) => s !== "KIV").map(
                            (status) => (
                              <option key={status} value={status}>
                                {STATUS_META[status].label}
                              </option>
                            ),
                          )}
                        </NativeSelect>
                      )}
                    </Field>
                    <Field label="Reason" required>
                      {(props) => (
                        <textarea
                          {...props}
                          name="reason"
                          rows={3}
                          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                        />
                      )}
                    </Field>
                    <SubmitButton pendingLabel="Correcting…">
                      Apply correction
                    </SubmitButton>
                  </form>
                ) : null}
              </div>
            ) : null}

            <p className="text-muted-foreground text-xs">
              Last updated {formatDateTime(record.updatedAt)}
            </p>
          </section>
        </div>

        <section className="surface p-5">
          <h2 className="text-sm font-semibold">Movement history</h2>
          {events.length === 0 ? (
            <p className="text-muted-foreground mt-3 text-sm">
              No movement has been recorded for this letter yet.
            </p>
          ) : (
            <ol className="mt-4 space-y-3">
              {events.map((event) => {
                const routeLabel =
                  event.toOfficeName
                    ? event.fromOfficeName
                      ? `${event.fromOfficeName} → ${event.toOfficeName}`
                      : `Provost Office → ${event.toOfficeName}`
                    : null;
                return (
                <li
                  key={event.id}
                  className="border-border/70 border-l-2 pl-3"
                >
                  <p className="text-sm font-medium">
                    {eventLabel(event.type)}
                    {event.toStatus &&
                    event.type !== "HANDOFF_CREATED" &&
                    event.type !== "PHYSICAL_RECEIVED" &&
                    event.type !== "PHYSICAL_NOT_RECEIVED" &&
                    event.type !== "PHYSICAL_RESENT"
                      ? ` · ${STATUS_META[event.toStatus].label}`
                      : ""}
                  </p>
                  {routeLabel ? (
                    <p className="text-sm">{routeLabel}</p>
                  ) : null}
                  <p className="text-muted-foreground text-xs">
                    {event.actor?.fullName ?? "System"} ·{" "}
                    {formatDateTime(event.createdAt)}
                  </p>
                  {event.note ? (
                    <p className="mt-1 text-sm leading-relaxed">{event.note}</p>
                  ) : null}
                </li>
                );
              })}
            </ol>
          )}
        </section>
      </PageBody>
    </>
  );
}

function eventLabel(type: string) {
  switch (type) {
    case "CREATED":
      return "Logged";
    case "UPDATED":
      return "Details updated";
    case "ADVANCED":
      return "Advanced";
    case "DISPATCHED":
      return "Sent to a unit";
    case "FORWARDED":
      return "Sent to another unit";
    case "HANDOFF_CREATED":
      return "Waiting for physical copy";
    case "PHYSICAL_RECEIVED":
      return "Paper copy confirmed";
    case "PHYSICAL_NOT_RECEIVED":
      return "Paper copy not received";
    case "PHYSICAL_RESENT":
      return "Paper copy resent";
    case "VIRTUAL_RECORD_MISSING":
      return "Physical copy without a register entry";
    case "DISCREPANCY_RESOLVED":
      return "Discrepancy resolved";
    case "CLOSED":
      return "Closed";
    case "PARKED_KIV":
      return "Kept in view";
    case "RESUMED_KIV":
      return "Resumed";
    case "CORRECTED":
      return "Administrative correction";
    case "IMPORTED":
      return "Imported from previous register";
    default:
      return type;
  }
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
      <dd className="mt-0.5">{value || "—"}</dd>
    </div>
  );
}
