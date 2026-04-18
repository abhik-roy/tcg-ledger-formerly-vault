/**
 * @file auth-guard.test.ts
 * @description Tests for auth guard functions (requireUser, requireAdmin, requireOwnership)
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockAuth = vi.fn()

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    holding: {
      findUnique: vi.fn(),
    },
  },
}))

import { requireUser, requireAdmin, requireOwnership } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"

const mockFindUnique = prisma.holding.findUnique as ReturnType<typeof vi.fn>

// ---------------------------------------------------------------------------
// Tests: requireUser
// ---------------------------------------------------------------------------

describe("requireUser", () => {
  beforeEach(() => vi.clearAllMocks())

  it("throws when no session", async () => {
    mockAuth.mockResolvedValue(null)

    await expect(requireUser()).rejects.toThrow("Unauthorized")
  })

  it("throws when session has no user id", async () => {
    mockAuth.mockResolvedValue({ user: {} })

    await expect(requireUser()).rejects.toThrow("Unauthorized")
  })

  it("returns session when authenticated", async () => {
    const session = { user: { id: "user-1", role: "USER" } }
    mockAuth.mockResolvedValue(session)

    const result = await requireUser()

    expect(result).toEqual(session)
  })
})

// ---------------------------------------------------------------------------
// Tests: requireAdmin
// ---------------------------------------------------------------------------

describe("requireAdmin", () => {
  beforeEach(() => vi.clearAllMocks())

  it("throws when role is USER", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "USER" } })

    await expect(requireAdmin()).rejects.toThrow("Unauthorized")
  })

  it("throws when no session", async () => {
    mockAuth.mockResolvedValue(null)

    await expect(requireAdmin()).rejects.toThrow("Unauthorized")
  })

  it("returns session when role is ADMIN", async () => {
    const session = { user: { id: "admin-1", role: "ADMIN" } }
    mockAuth.mockResolvedValue(session)

    const result = await requireAdmin()

    expect(result).toEqual(session)
  })
})

// ---------------------------------------------------------------------------
// Tests: requireOwnership
// ---------------------------------------------------------------------------

describe("requireOwnership", () => {
  beforeEach(() => vi.clearAllMocks())

  it("throws when holding not found", async () => {
    mockFindUnique.mockResolvedValue(null)

    await expect(requireOwnership("no-exist", "user-1")).rejects.toThrow("Holding not found")
  })

  it("throws when holding belongs to different user and caller is not ADMIN", async () => {
    mockFindUnique.mockResolvedValue({ userId: "user-2" })
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "USER" } })

    await expect(requireOwnership("h-1", "user-1")).rejects.toThrow(
      "Unauthorized: you do not own this holding"
    )
  })

  it("allows ADMIN on any holding", async () => {
    mockFindUnique.mockResolvedValue({ userId: "user-2" })
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } })

    // Should not throw
    await expect(requireOwnership("h-1", "admin-1")).resolves.toBeUndefined()
  })

  it("allows owner to access their own holding", async () => {
    mockFindUnique.mockResolvedValue({ userId: "user-1" })
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "USER" } })

    await expect(requireOwnership("h-1", "user-1")).resolves.toBeUndefined()
  })
})
