/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file settings.repository.ts
 * @module repositories/settings
 * @description
 *   Data access layer for the store settings module. All Prisma queries for
 *   the `StoreSettings` table are consolidated here. The settings table uses
 *   a singleton pattern with a fixed ID of "singleton".
 *
 * @layer Repository
 * @dependencies prisma client
 */

import { prisma } from "@/lib/prisma"

/** The fixed primary key for the singleton settings row. */
const SETTINGS_ID = "singleton"

export class SettingsRepository {
  /**
   * Retrieves the store settings singleton row.
   *
   * @returns {Promise<any | null>} The settings record or null if not yet created.
   *
   * @example
   *   const settings = await SettingsRepository.find()
   */
  static async find() {
    return prisma.storeSettings.findUnique({ where: { id: SETTINGS_ID } })
  }

  /**
   * Upserts the store settings. Creates the singleton row if it doesn't
   * exist, or updates it if it does.
   *
   * @param {object} data - The settings fields to set.
   * @returns {Promise<any>} The upserted settings record.
   */
  static async upsert(data: Record<string, any>) {
    return prisma.storeSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...data } as any,
      update: data,
    })
  }
}
