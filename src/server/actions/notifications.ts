"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/guards";
import { notificationService } from "@/server/services/notificationService";
import {
  actionSuccess,
  toActionError,
  type ActionState,
} from "@/server/actions/types";

export async function markNotificationReadAction(
  id: string,
): Promise<ActionState> {
  try {
    const user = await requireUser();
    await notificationService.markRead(user.id, id);
    revalidatePath("/", "layout");
    return actionSuccess("Notification marked read.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function markAllNotificationsReadAction(): Promise<ActionState> {
  try {
    const user = await requireUser();
    await notificationService.markAllRead(user.id);
    revalidatePath("/", "layout");
    return actionSuccess("All notifications marked read.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function listNotificationsAction() {
  const user = await requireUser();
  return notificationService.listForUser(user.id, 20);
}
