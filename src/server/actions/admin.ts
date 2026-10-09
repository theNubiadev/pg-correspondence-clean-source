"use server";

import { revalidatePath } from "next/cache";

import { requireSystemAdmin } from "@/lib/auth/guards";
import {
  createUserSchema,
  destinationOfficeSchema,
  resetPasswordSchema,
  settingsSchema,
  updateDestinationOfficeSchema,
  updateUserSchema,
} from "@/lib/validations/admin";
import { OfficeDeleteError, settingsService } from "@/server/services/settingsService";
import { userService } from "@/server/services/userService";
import {
  actionError,
  actionErrorFromZod,
  actionSuccess,
  formBoolean,
  formToObject,
  idleState,
  toActionError,
  type ActionState,
} from "@/server/actions/types";

export async function saveSettingsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = settingsSchema.safeParse(formToObject(formData));
  if (!parsed.success) return actionErrorFromZod(parsed.error);

  try {
    const user = await requireSystemAdmin();
    await settingsService.saveSettings(parsed.data, user.id);
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return actionSuccess("Settings saved.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function createDestinationOfficeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = destinationOfficeSchema.safeParse(formToObject(formData));
  if (!parsed.success) return actionErrorFromZod(parsed.error);

  try {
    const user = await requireSystemAdmin();
    await settingsService.createOffice(parsed.data.officeName, user.id);
    revalidatePath("/settings");
    return actionSuccess("Destination office added.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateDestinationOfficeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateDestinationOfficeSchema.safeParse(formToObject(formData));
  if (!parsed.success) return actionErrorFromZod(parsed.error);

  try {
    const user = await requireSystemAdmin();
    await settingsService.updateOffice(
      parsed.data.id,
      {
        officeName: parsed.data.officeName,
        status: parsed.data.status,
      },
      user.id,
    );
    revalidatePath("/settings");
    return actionSuccess("Destination office updated.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteDestinationOfficeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return actionError("Choose a unit to delete.");

  try {
    const user = await requireSystemAdmin();
    await settingsService.deleteOffice(id, user.id);
    revalidatePath("/settings");
    revalidatePath("/correspondence");
    return actionSuccess("Unit deleted.");
  } catch (error) {
    if (error instanceof OfficeDeleteError) return actionError(error.message);
    return toActionError(error);
  }
}

export async function createUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createUserSchema.safeParse(formToObject(formData));
  if (!parsed.success) return actionErrorFromZod(parsed.error);

  try {
    const actor = await requireSystemAdmin();
    await userService.create({
      ...parsed.data,
      actorId: actor.id,
    });
    revalidatePath("/staff");
    return actionSuccess("User created.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateUserSchema.safeParse(formToObject(formData));
  if (!parsed.success) return actionErrorFromZod(parsed.error);

  try {
    const actor = await requireSystemAdmin();
    const { id, ...data } = parsed.data;
    await userService.update(id, {
      ...data,
      actorId: actor.id,
    });
    revalidatePath("/staff");
    return actionSuccess("User updated.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function resetUserPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse(formToObject(formData));
  if (!parsed.success) return actionErrorFromZod(parsed.error);

  try {
    const actor = await requireSystemAdmin();
    await userService.resetPassword(parsed.data.id, parsed.data.password, actor.id);
    revalidatePath("/staff");
    return actionSuccess("Password reset. The user must sign in with the new password.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function toggleUserStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const active = formBoolean(formData.get("active"));

  if (!id) return actionError("Missing user id.");

  try {
    const actor = await requireSystemAdmin();
    await userService.setActive(id, active, actor.id);
    revalidatePath("/staff");
    return actionSuccess(active ? "User activated." : "User deactivated.");
  } catch (error) {
    return toActionError(error);
  }
}

/** Direct form action wrapper (no useActionState). */
export async function toggleUserStatusFormAction(formData: FormData): Promise<void> {
  await toggleUserStatusAction(idleState, formData);
}
