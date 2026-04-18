import { describe, it, expect, vi, beforeEach } from "vitest"
import crypto from "crypto"

// ── Mocks (must be declared before imports) ─────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
  },
}))

import { POST } from "@/app/api/auth/reset-password/route"
import { prisma } from "@/lib/prisma"

const mockFindFirst = prisma.customer.findFirst as ReturnType<typeof vi.fn>
const mockUpdate = prisma.customer.update as ReturnType<typeof vi.fn>

// ── Helpers ─────────────────────────────────────────────────────────────

function makeRequest(body: object) {
  return new Request("http://localhost/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

// A valid password that meets all requirements (>= 8 chars, has number/special)
const VALID_PASSWORD = "SecurePass1"

// ── Tests ───────────────────────────────────────────────────────────────

describe("POST /api/auth/reset-password (DEV-11)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("resets password successfully with valid token and valid password", async () => {
    const customer = { id: "cust_1", email: "user@example.com" }
    mockFindFirst.mockResolvedValue(customer)
    mockUpdate.mockResolvedValue(customer)

    const res = await POST(makeRequest({ token: "abc123", newPassword: VALID_PASSWORD }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.message).toContain("Password reset successfully")
    expect(mockUpdate).toHaveBeenCalledOnce()
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "cust_1" },
      data: {
        password: "hashed-password",
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    })
  })

  it("returns 400 when token is invalid/expired (findFirst returns null)", async () => {
    mockFindFirst.mockResolvedValue(null)

    const res = await POST(makeRequest({ token: "expired_token", newPassword: VALID_PASSWORD }))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.message).toContain("Invalid or expired")
  })

  it("returns 400 when token is missing", async () => {
    const res = await POST(makeRequest({ newPassword: VALID_PASSWORD }))

    expect(res.status).toBe(400)
  })

  it("returns 400 when password is too short (< 8 chars)", async () => {
    const res = await POST(makeRequest({ token: "abc123", newPassword: "Sho1!" }))

    expect(res.status).toBe(400)
    expect(mockFindFirst).not.toHaveBeenCalled()
  })

  it("returns 400 when password is too long (> 128 chars)", async () => {
    const longPassword = "A1" + "a".repeat(128)
    const res = await POST(makeRequest({ token: "abc123", newPassword: longPassword }))

    expect(res.status).toBe(400)
    expect(mockFindFirst).not.toHaveBeenCalled()
  })

  it("returns 400 when newPassword is missing", async () => {
    const res = await POST(makeRequest({ token: "abc123" }))

    expect(res.status).toBe(400)
  })

  it("clears token fields after successful reset", async () => {
    const customer = { id: "cust_2", email: "user@example.com" }
    mockFindFirst.mockResolvedValue(customer)
    mockUpdate.mockResolvedValue(customer)

    await POST(makeRequest({ token: "validtoken", newPassword: VALID_PASSWORD }))

    const updateCall = mockUpdate.mock.calls[0][0]
    expect(updateCall.data.passwordResetToken).toBeNull()
    expect(updateCall.data.passwordResetExpiry).toBeNull()
  })

  it("hashes the token with SHA-256 before DB lookup", async () => {
    mockFindFirst.mockResolvedValue(null)

    const rawToken = "abc123"
    const expectedHash = crypto.createHash("sha256").update(rawToken).digest("hex")

    await POST(makeRequest({ token: rawToken, newPassword: VALID_PASSWORD }))

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: {
        passwordResetToken: expectedHash,
        passwordResetExpiry: { gt: expect.any(Date) },
      },
    })
  })
})
