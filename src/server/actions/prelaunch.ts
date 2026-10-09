"use server";

import { revalidatePath } from "next/cache";

import { requireSystemAdmin } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import {
  actionError,
  actionErrorFromZod,
  actionSuccess,
  formToObject,
  toActionError,
  type ActionState,
} from "@/server/actions/types";
import { z } from "zod";

const prelaunchSchema = z.object({
  title: z.string().trim().min(3, "Give the event a title").max(160),
  heldAt: z.coerce.date({ invalid_type_error: "Choose the date of the event" }),
  venue: z.string().trim().max(160).optional(),
  notes: z.string().trim().max(5000).optional(),
});

export async function recordPrelaunchEventAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireSystemAdmin();
    const parsed = prelaunchSchema.safeParse(formToObject(formData));
    if (!parsed.success) return actionErrorFromZod(parsed.error);

    const event = await prisma.prelaunchEvent.create({
      data: {
        title: parsed.data.title,
        heldAt: parsed.data.heldAt,
        venue: parsed.data.venue?.trim() || null,
        notes: parsed.data.notes?.trim() || null,
        recordedById: user.id,
      },
    });

    await recordAudit({
      userId: user.id,
      action: "RECORD_PRELAUNCH_EVENT",
      module: "prelaunch",
      details: event.id,
    });

    revalidatePath("/prelaunch");
    return actionSuccess("Pre-launch event recorded.");
  } catch (error) {
    if (error instanceof Error && error.name === "ForbiddenError") {
      return actionError(error.message);
    }
    return toActionError(error);
  }
}
