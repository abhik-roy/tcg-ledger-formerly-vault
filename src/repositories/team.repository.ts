/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file team.repository.ts
 * @module repositories/team
 * @description
 *   Data access layer for the team (admin user) module. All Prisma queries
 *   for the `User` and `UserPermissions` tables are consolidated here.
 *
 * @layer Repository
 * @dependencies prisma client
 */

import { prisma } from "@/lib/prisma"

export class TeamRepository {
  /**
   * Retrieves all team members (admin users) with their permissions.
   *
   * @returns {Promise<any[]>} All users ordered by creation date ascending.
   */
  static async findAll() {
    return prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      include: { permissions: true },
    })
  }

  /**
   * Finds a user by their email address.
   *
   * @param {string} email - The user's email.
   * @returns {Promise<any | null>} The user record or null.
   */
  static async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } })
  }

  /**
   * Finds a user by their ID.
   *
   * @param {string} id - The user's ID.
   * @returns {Promise<any | null>} The user record or null.
   */
  static async findById(id: string) {
    return prisma.user.findUnique({ where: { id } })
  }

  /**
   * Creates a new user (admin or team member).
   *
   * @param {object} data - The user data.
   * @param {string} data.name - The user's display name.
   * @param {string} data.email - The user's email.
   * @param {string} data.password - The hashed password.
   * @param {string} data.role - The role ("ADMIN" or "TEAM").
   * @param {object} [data.permissions] - Optional permissions for TEAM role.
   * @returns {Promise<any>} The created user record.
   */
  static async create(data: {
    name: string
    email: string
    password: string
    role: string
    permissions?: any
  }) {
    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
        ...(data.permissions ? { permissions: { create: data.permissions } } : {}),
      },
    })
  }

  /**
   * Updates a user's name and role.
   *
   * @param {string} id - The user's ID.
   * @param {object} data - The fields to update.
   * @returns {Promise<any>} The updated user record.
   */
  static async update(id: string, data: { name: string; role: string }) {
    return prisma.user.update({
      where: { id },
      data: { name: data.name, role: data.role },
    })
  }

  /**
   * Updates a user's password.
   *
   * @param {string} id - The user's ID.
   * @param {string} hashedPassword - The new hashed password.
   * @returns {Promise<any>} The updated user record.
   */
  static async updatePassword(id: string, hashedPassword: string) {
    return prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    })
  }

  /**
   * Deletes a user by their ID.
   * Associated permissions are cascade-deleted by the database.
   *
   * @param {string} id - The user's ID.
   * @returns {Promise<any>} The deleted user record.
   */
  static async delete(id: string) {
    return prisma.user.delete({ where: { id } })
  }

  /**
   * Upserts permissions for a user. Creates the row if it doesn't exist,
   * updates it if it does.
   *
   * @param {string} userId - The user's ID.
   * @param {object} permissions - The permission flags to set.
   * @returns {Promise<any>} The upserted permissions record.
   */
  static async upsertPermissions(userId: string, permissions: any) {
    return prisma.userPermissions.upsert({
      where: { userId },
      create: { userId, ...permissions },
      update: permissions,
    })
  }

  /**
   * Updates a user's displayName.
   */
  static async updateDisplayName(id: string, displayName: string | undefined) {
    return prisma.user.update({
      where: { id },
      data: { displayName },
    })
  }

  /**
   * Deletes permissions for a user.
   * Used when promoting a TEAM member to ADMIN (who doesn't need permissions).
   *
   * @param {string} userId - The user's ID.
   * @returns {Promise<any>} The delete result.
   */
  static async deletePermissions(userId: string) {
    return prisma.userPermissions.deleteMany({ where: { userId } })
  }
}
