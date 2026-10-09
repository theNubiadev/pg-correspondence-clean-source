import type { CorrespondenceStatus, PhysicalReceiptState } from "@prisma/client";

import type { CurrentUser } from "@/lib/auth/session";
import { canAccessAllCorrespondence, isDepartmentStaff } from "@/lib/auth/permissions";
import { STATUS_FLOW, STATUS_META } from "@/lib/constants";

export type ProgressStep = {
  key: string;
  label: string;
  done: boolean;
  active: boolean;
};

export type ProgressView = {
  kind: "lifecycle" | "handoff" | "summary";
  title: string;
  description: string;
  percent: number;
  steps: ProgressStep[];
};

export type CurrentHandoffView = {
  id: string;
  state: PhysicalReceiptState;
  toOfficeId: string;
  toOfficeName: string | null;
  fromOfficeName: string | null;
  virtualSentAt: Date;
  acknowledgedAt: Date | null;
  note: string | null;
};

export function handoffLabel(state: PhysicalReceiptState): string {
  switch (state) {
    case "RECEIVED":
      return "Physical copy received";
    case "NOT_RECEIVED":
      return "Physical copy not received";
    case "PENDING":
      return "Waiting for physical copy";
    default:
      return "Waiting for physical copy";
  }
}

/**
 * What staff should see on badges and headers.
 * DB status stays DISPATCHED; presentation follows physical-receipt state.
 */
export function displayStatusLabel(
  status: CorrespondenceStatus,
  handoffState?: PhysicalReceiptState | null,
): string {
  if (status === "DISPATCHED" && handoffState === "PENDING") {
    return "Waiting for physical copy";
  }
  if (status === "DISPATCHED" && handoffState === "NOT_RECEIVED") {
    return "Physical copy not received";
  }
  if (status === "DISPATCHED" && handoffState === "RECEIVED") {
    return "Physical copy received";
  }
  return STATUS_META[status].label;
}

export function displayStatusToken(
  status: CorrespondenceStatus,
  handoffState?: PhysicalReceiptState | null,
): string {
  if (status === "DISPATCHED" && handoffState === "PENDING") {
    return "--status-awaiting-approval";
  }
  if (status === "DISPATCHED" && handoffState === "NOT_RECEIVED") {
    return "--destructive";
  }
  if (status === "DISPATCHED" && handoffState === "RECEIVED") {
    return "--status-closed";
  }
  return STATUS_META[status].token;
}

export function displayStatusDescription(
  status: CorrespondenceStatus,
  handoffState?: PhysicalReceiptState | null,
  destinationName?: string | null,
): string {
  if (status === "DISPATCHED" && handoffState === "PENDING") {
    return destinationName
      ? `Virtual record sent to ${destinationName}. Waiting for physical receipt confirmation.`
      : "Virtual record sent. Waiting for physical receipt confirmation.";
  }
  if (status === "DISPATCHED" && handoffState === "NOT_RECEIVED") {
    return destinationName
      ? `${destinationName} reported that the physical copy has not arrived.`
      : "The receiving unit reported that the physical copy has not arrived.";
  }
  if (status === "DISPATCHED" && handoffState === "RECEIVED") {
    return destinationName
      ? `${destinationName} confirmed the physical copy was received.`
      : "The receiving unit confirmed the physical copy was received.";
  }
  return STATUS_META[status].description;
}

export function progressForViewer(input: {
  user: CurrentUser;
  status: CorrespondenceStatus;
  statusBeforeKiv?: CorrespondenceStatus | null;
  destinationName?: string | null;
  destinationOfficeId?: string | null;
  handoff?: CurrentHandoffView | null;
}): ProgressView {
  const { user, status, statusBeforeKiv, destinationName, destinationOfficeId, handoff } =
    input;
  const pipelineStatus =
    status === "KIV" && statusBeforeKiv && statusBeforeKiv !== "KIV"
      ? statusBeforeKiv
      : status === "KIV"
        ? "AWAITING_PROVOST_ACTION"
        : status;

  if (canAccessAllCorrespondence(user)) {
    const currentIndex = Math.max(0, STATUS_FLOW.indexOf(pipelineStatus));
    const percent = Math.round((currentIndex / (STATUS_FLOW.length - 1)) * 100);
    return {
      kind: "lifecycle",
      title: displayStatusLabel(status, handoff?.state),
      description: handoff
        ? `${handoffLabel(handoff.state)}${destinationName ? ` · ${destinationName}` : ""}`
        : STATUS_META[status].description,
      percent,
      steps: STATUS_FLOW.map((step, index) => ({
        key: step,
        label:
          destinationName && (step === "DISPATCHED" || step === "CLOSED")
            ? `${STATUS_META[step].label} · ${destinationName}`
            : STATUS_META[step].label,
        done: index <= currentIndex,
        active: status !== "KIV" && index === currentIndex,
      })),
    };
  }

  const assignedToViewer =
    isDepartmentStaff(user) &&
    Boolean(user.destinationOfficeId) &&
    user.destinationOfficeId === destinationOfficeId;

  if (assignedToViewer && (status === "DISPATCHED" || status === "KIV") && handoff) {
    const steps: ProgressStep[] = [
      {
        key: "virtual",
        label: "Virtual record sent",
        done: true,
        active: false,
      },
      {
        key: "physical",
        label: handoffLabel(handoff.state),
        done: handoff.state === "RECEIVED",
        active: handoff.state !== "RECEIVED",
      },
      {
        key: "next",
        label:
          handoff.state === "RECEIVED"
            ? "Ready to forward or close"
            : "Confirm the physical copy",
        done: false,
        active: handoff.state === "RECEIVED",
      },
    ];
    const percent =
      handoff.state === "RECEIVED" ? 70 : handoff.state === "NOT_RECEIVED" ? 35 : 40;
    return {
      kind: "handoff",
      title: handoffLabel(handoff.state),
      description: destinationName
        ? `Assigned to ${destinationName}.`
        : "Assigned to your unit.",
      percent,
      steps,
    };
  }

  return {
    kind: "summary",
    title: STATUS_META[status].label,
    description: destinationName
      ? `Currently with ${destinationName}.`
      : STATUS_META[status].description,
    percent: status === "CLOSED" ? 100 : status === "DISPATCHED" ? 80 : 40,
    steps: [
      {
        key: "status",
        label: STATUS_META[status].label,
        done: true,
        active: status !== "CLOSED",
      },
    ],
  };
}
