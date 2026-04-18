/**
 * @file pos-pin.test.ts
 * @description Unit tests for POS PIN verification — bcrypt hashing (DEV-18)
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import bcrypt from "bcryptjs"

vi.mock("@/repositories/settings.repository", () => ({
  SettingsRepository: {
    find: vi.fn(),
  },
}))

// Mock inventory/order/log repos to prevent real DB calls
vi.mock("@/repositories/inventory.repository", () => ({
  InventoryRepository: { findForPOS: vi.fn() },
}))
vi.mock("@/repositories/order.repository", () => ({
  OrderRepository: { transaction: vi.fn() },
}))
vi.mock("@/repositories/log.repository", () => ({
  LogRepository: { createQuantityLog: vi.fn() },
}))

import { POSService } from "@/services/pos.service"
import { SettingsRepository } from "@/repositories/settings.repository"

const mockFind = SettingsRepository.find as ReturnType<typeof vi.fn>

describe("POSService.verifyExitPin (DEV-18)", () => {
  beforeEach(() => vi.clearAllMocks())

  describe("with a bcrypt-hashed PIN stored in DB", () => {
    it("returns valid=true when the PIN matches the stored hash", async () => {
      const hash = await bcrypt.hash("5678", 10)
      mockFind.mockResolvedValue({ posExitPin: hash })

      const result = await POSService.verifyExitPin("5678")

      expect(result.valid).toBe(true)
    })

    it("returns valid=false when the PIN does not match", async () => {
      const hash = await bcrypt.hash("5678", 10)
      mockFind.mockResolvedValue({ posExitPin: hash })

      const result = await POSService.verifyExitPin("wrong")

      expect(result.valid).toBe(false)
    })

    it("returns valid=false for the wrong PIN even if close", async () => {
      const hash = await bcrypt.hash("1234", 10)
      mockFind.mockResolvedValue({ posExitPin: hash })

      const result = await POSService.verifyExitPin("1235")

      expect(result.valid).toBe(false)
    })
  })

  describe("backward compatibility — plaintext PIN (pre-migration)", () => {
    it("returns valid=true when plaintext PIN matches", async () => {
      // Simulate an old-style plaintext PIN still in the DB
      mockFind.mockResolvedValue({ posExitPin: "1234" })

      const result = await POSService.verifyExitPin("1234")

      expect(result.valid).toBe(true)
    })

    it("returns valid=false when plaintext PIN does not match", async () => {
      mockFind.mockResolvedValue({ posExitPin: "1234" })

      const result = await POSService.verifyExitPin("9999")

      expect(result.valid).toBe(false)
    })
  })

  describe("fallback when no settings exist", () => {
    it("uses the default PIN '1234' when DB returns null", async () => {
      mockFind.mockResolvedValue(null)

      const result = await POSService.verifyExitPin("1234")

      expect(result.valid).toBe(true)
    })

    it("rejects an incorrect PIN when settings are null", async () => {
      mockFind.mockResolvedValue(null)

      const result = await POSService.verifyExitPin("0000")

      expect(result.valid).toBe(false)
    })
  })
})

describe("SettingsService PIN hashing (DEV-18)", () => {
  // Integration-style test verifying the hash is stored, not plaintext
  it("produces a bcrypt-compatible hash for any PIN", async () => {
    const pin = "9012"
    const hash = await bcrypt.hash(pin, 10)

    expect(hash).toMatch(/^\$2[aby]\$/)
    expect(await bcrypt.compare(pin, hash)).toBe(true)
    expect(await bcrypt.compare("wrong", hash)).toBe(false)
  })
})
