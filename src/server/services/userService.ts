import "server-only";

import { recordAudit } from "@/lib/audit";
import { hashPassword } from "@/lib/auth/password";
import {
  displayNameFromUsername,
  syncPasswordHashes,
  upsertAuthenticAndProvision,
} from "@/lib/auth/provision-from-authentic";
import {
  resolveUniversityType,
  syntheticEmailForUsername,
} from "@/lib/auth/university-types";
import { revokeAllSessions } from "@/lib/auth/session";
import { userRepository } from "@/server/repositories/userRepository";

export type CreateUserInput = {
  username: string;
  password: string;
  userType: string;
  fullName?: string;
  email?: string;
  actorId: string;
};

export type UpdateUserInput = {
  username?: string;
  userType?: string | null;
  fullName?: string;
  email?: string;
  actorId: string;
};

export const userService = {
  list() {
    return userRepository.list();
  },

  async create(input: CreateUserInput) {
    const userType = input.userType.trim().toLowerCase();
    if (!resolveUniversityType(userType)) {
      throw new Error(`Unknown university user_type: ${input.userType}`);
    }

    const username = input.username.trim().toLowerCase();
    const { user } = await upsertAuthenticAndProvision({
      username,
      passHash: await hashPassword(input.password),
      userType,
      fullName: input.fullName?.trim() || displayNameFromUsername(username),
      email: input.email?.trim() || syntheticEmailForUsername(username),
      mustChangePassword: false,
    });

    await recordAudit({
      userId: input.actorId,
      action: "CREATE_USER",
      module: "users",
    });

    return user;
  },

  async update(id: string, input: UpdateUserInput) {
    const existing = await userRepository.findById(id);
    if (!existing) throw new Error("User not found");

    const username = (input.username ?? existing.username).trim().toLowerCase();
    const userTypeRaw =
      input.userType !== undefined ? input.userType : existing.userType;
    const userType = (userTypeRaw ?? "").trim().toLowerCase();
    if (!userType || !resolveUniversityType(userType)) {
      throw new Error(
        `University user_type is required (got: ${userTypeRaw ?? "empty"})`,
      );
    }

    const { user } = await upsertAuthenticAndProvision({
      username,
      passHash: existing.passwordHash,
      userType,
      fullName:
        input.fullName?.trim() ||
        existing.fullName ||
        displayNameFromUsername(username),
      email: input.email?.trim() || existing.email,
      mustChangePassword: existing.mustChangePassword,
      linkUserId: id,
    });

    await recordAudit({
      userId: input.actorId,
      action: "UPDATE_USER",
      module: "users",
    });

    return user;
  },

  async resetPassword(id: string, password: string, actorId: string) {
    const existing = await userRepository.findById(id);
    if (!existing) throw new Error("User not found");

    const passHash = await hashPassword(password);
    await syncPasswordHashes(id, passHash);

    if (existing.userType && resolveUniversityType(existing.userType)) {
      await upsertAuthenticAndProvision({
        username: existing.username,
        passHash,
        userType: existing.userType,
        fullName: existing.fullName,
        email: existing.email,
        mustChangePassword: false,
        linkUserId: id,
      });
    }

    await revokeAllSessions(id);

    await recordAudit({
      userId: actorId,
      action: "RESET_PASSWORD",
      module: "users",
    });

    return userRepository.findById(id);
  },

  async setActive(id: string, active: boolean, actorId: string) {
    const user = await userRepository.setStatus(
      id,
      active ? "ACTIVE" : "INACTIVE",
    );
    if (!active) await revokeAllSessions(id);

    await recordAudit({
      userId: actorId,
      action: active ? "ACTIVATE_USER" : "DEACTIVATE_USER",
      module: "users",
    });

    return user;
  },
};
