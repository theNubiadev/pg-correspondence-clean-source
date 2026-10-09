import type { CorrespondenceStatus } from "@prisma/client";

import { nextStatus, STATUS_FLOW } from "@/lib/constants";

export type TransitionKind =
  | "advance"
  | "dispatch"
  | "forward"
  | "close"
  | "park_kiv"
  | "resume_kiv"
  | "create"
  | "correct";

export type TransitionDecision =
  | { ok: true }
  | { ok: false; reason: string };

const PIPELINE = new Set<CorrespondenceStatus>(STATUS_FLOW);

export function isPipelineStatus(
  status: CorrespondenceStatus,
): status is Exclude<CorrespondenceStatus, "KIV"> {
  return PIPELINE.has(status);
}

/**
 * Whether `to` is the next pipeline stage after `from`.
 * KIV is never a next stage.
 */
export function isForwardStep(
  from: CorrespondenceStatus,
  to: CorrespondenceStatus,
): boolean {
  if (from === "KIV" || to === "KIV") return false;
  return nextStatus(from) === to;
}

export function assertCanAdvance(
  current: CorrespondenceStatus,
): TransitionDecision {
  if (current === "KIV") {
    return {
      ok: false,
      reason: "This letter is on Keep in view. Resume it before advancing.",
    };
  }
  if (current === "CLOSED") {
    return { ok: false, reason: "Closed correspondence cannot be advanced." };
  }
  if (current === "TREATED") {
    return {
      ok: false,
      reason: "Treated letters must be dispatched to a destination unit.",
    };
  }
  if (current === "DISPATCHED") {
    return {
      ok: false,
      reason: "Dispatched letters are closed from the assigned unit, not advanced.",
    };
  }
  if (!nextStatus(current)) {
    return { ok: false, reason: "This correspondence cannot be advanced." };
  }
  return { ok: true };
}

export function assertCanDispatch(
  current: CorrespondenceStatus,
): TransitionDecision {
  if (current === "CLOSED") {
    return { ok: false, reason: "Closed correspondence cannot be dispatched." };
  }
  if (current === "DISPATCHED") {
    return { ok: false, reason: "This correspondence is already dispatched." };
  }
  if (current === "KIV") {
    return {
      ok: false,
      reason: "Resume the letter from Keep in view before dispatching.",
    };
  }
  if (current !== "TREATED") {
    return {
      ok: false,
      reason: "Treat the letter before dispatching it to a unit.",
    };
  }
  return { ok: true };
}

export function assertCanForward(
  current: CorrespondenceStatus,
): TransitionDecision {
  if (current === "CLOSED") {
    return { ok: false, reason: "Closed correspondence cannot be forwarded." };
  }
  if (current === "KIV") {
    return {
      ok: false,
      reason: "Resume the letter from Keep in view before forwarding.",
    };
  }
  if (current !== "DISPATCHED") {
    return {
      ok: false,
      reason: "Only a dispatched letter can be sent to another unit.",
    };
  }
  return { ok: true };
}

export function assertCanClose(
  current: CorrespondenceStatus,
): TransitionDecision {
  if (current !== "DISPATCHED") {
    return {
      ok: false,
      reason: "Only a dispatched letter can be closed.",
    };
  }
  return { ok: true };
}

export function assertCanParkKiv(
  current: CorrespondenceStatus,
): TransitionDecision {
  if (current === "KIV") {
    return { ok: false, reason: "This letter is already on Keep in view." };
  }
  if (current === "CLOSED") {
    return { ok: false, reason: "Closed correspondence cannot be kept in view." };
  }
  return { ok: true };
}

export function assertCanResumeKiv(
  current: CorrespondenceStatus,
): TransitionDecision {
  if (current !== "KIV") {
    return { ok: false, reason: "This letter is not on Keep in view." };
  }
  return { ok: true };
}

/**
 * Super Admin correction: any pipeline status except reopening CLOSED
 * without an explicit correct-to-open, and never to KIV (use park).
 */
export function assertCanCorrect(
  current: CorrespondenceStatus,
  target: CorrespondenceStatus,
): TransitionDecision {
  if (current === target) {
    return { ok: false, reason: "The letter is already at that status." };
  }
  if (target === "KIV") {
    return {
      ok: false,
      reason: "Use Keep in view rather than an administrative correction.",
    };
  }
  if (current === "CLOSED") {
    return {
      ok: false,
      reason: "Closed correspondence cannot be reopened.",
    };
  }
  if (!isPipelineStatus(target)) {
    return { ok: false, reason: "Choose a valid register status." };
  }
  return { ok: true };
}

export function assertTransition(
  kind: TransitionKind,
  current: CorrespondenceStatus,
  target?: CorrespondenceStatus,
): TransitionDecision {
  switch (kind) {
    case "advance":
      return assertCanAdvance(current);
    case "dispatch":
      return assertCanDispatch(current);
    case "forward":
      return assertCanForward(current);
    case "close":
      return assertCanClose(current);
    case "park_kiv":
      return assertCanParkKiv(current);
    case "resume_kiv":
      return assertCanResumeKiv(current);
    case "correct":
      if (!target) {
        return { ok: false, reason: "Choose the status to apply." };
      }
      return assertCanCorrect(current, target);
    case "create":
      if (target !== "AWAITING_PROVOST_ACTION") {
        return {
          ok: false,
          reason: "A new letter starts as Awaiting Provost action.",
        };
      }
      return { ok: true };
    default:
      return { ok: false, reason: "Unknown transition." };
  }
}
