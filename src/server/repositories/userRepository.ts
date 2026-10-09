import "server-only";

import type { Prisma, UserRole, UserStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const userRepository = {
  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  async findByUsername(username: string) {
    return prisma.user.findUnique({ where: { username } });
  },

  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  async list() {
    return prisma.user.findMany({
      orderBy: [{ fullName: "asc" }],
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
        userType: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        destinationOffice: { select: { officeName: true } },
      },
    });
  },

  async create(data: Prisma.UserCreateInput) {
    return prisma.user.create({ data });
  },

  async update(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({ where: { id }, data });
  },

  async setStatus(id: string, status: UserStatus) {
    return prisma.user.update({ where: { id }, data: { status } });
  },

  async setRole(id: string, role: UserRole) {
    return prisma.user.update({ where: { id }, data: { role } });
  },

  async resetPassword(id: string, passwordHash: string) {
    return prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        mustChangePassword: true,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
  },
};
