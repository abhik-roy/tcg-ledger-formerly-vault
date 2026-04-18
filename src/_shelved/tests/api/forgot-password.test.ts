import { describe, it, expect, vi, beforeEach } from "vitest"
import crypto from "crypto"

// ── Hoisted state for dynamic headers mock ──────────────────────────────

const { currentIp } = vi.hoisted(() => ({
  currentIp: { value: "127.0.0.1" },
}))

// ── Mocks (must be declared before imports) ─────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock("@/services/email.service", () => ({
  EmailService: {
    sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock("next/headers", () => ({
  headers: vi
    .fn()
    .mockImplementation(() => Promise.resolve(new Map([["x-forwarded-for", currentIp.value]]))),
}))

import { POST } from "@/app/api/auth/forgot-password/route"
import { prisma } from "@/lib/prisma"
import { EmailService } from "@/services/email.service"

const mockFindUnique = prisma.customer.findUnique as ReturnType<typeof vi.fn>
const mockUpdate = prisma.customer.update as ReturnType<typeof vi.fn>
const mockSendReset = EmailService.sendPasswordResetEmail as ReturnType<typeof vi.fn>

// ── Helpers ─────────────────────────────────────────────────────────────

function makeRequest(body: object) {
  return new Request("http://localhost/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

/** Set the IP that the headers mock will return for subsequent calls. */
function setIp(ip: string) {
  currentIp.value = ip
}

// ── Tests ───────────────────────────────────────────────────────────────

describe("POST /api/auth/forgot-password (DEV-11)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 200 and sends reset email when customer exists", async () => {
    setIp("10.0.0.1")
    const customer = { id: "cust_1", email: "user@example.com" }
    mockFindUnique.mockResolvedValue(customer)
    mockUpdate.mockResolvedValue(customer)

    const res = await POST(makeRequest({ email: "user@example.com" }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.message).toContain("If an account with that email exists")
    expect(mockUpdate).toHaveBeenCalledOnce()
    expect(mockSendReset).toHaveBeenCalledOnce()
    expect(mockSendReset).toHaveBeenCalledWith("user@example.com", expect.any(String))
  })

  it("returns 200 with same generic message when customer does NOT exist (anti-enumeration)", async () => {
    setIp("10.0.0.2")
    mockFindUnique.mockResolvedValue(null)

    const res = await POST(makeRequest({ email: "nobody@example.com" }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.message).toContain("If an account with that email exists")
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockSendReset).not.toHaveBeenCalled()
  })

  it("returns 400 for invalid email format", async () => {
    setIp("10.0.0.3")
    const res = await POST(makeRequest({ email: "not-an-email" }))

    expect(res.status).toBe(400)
  })

  it("returns 400 for missing email field", async () => {
    setIp("10.0.0.4")
    const res = await POST(makeRequest({}))

    expect(res.status).toBe(400)
  })

  it("rate-limits: 4th request from same IP returns 429", async () => {
    setIp("10.0.0.99")
    mockFindUnique.mockResolvedValue(null)

    const r1 = await POST(makeRequest({ email: "a@b.com" }))
    const r2 = await POST(makeRequest({ email: "a@b.com" }))
    const r3 = await POST(makeRequest({ email: "a@b.com" }))
    const r4 = await POST(makeRequest({ email: "a@b.com" }))

    expect(r1.status).toBe(200)
    expect(r2.status).toBe(200)
    expect(r3.status).toBe(200)
    expect(r4.status).toBe(429)
  })

  it("stores the token as SHA-256 hash, not plaintext", async () => {
    setIp("10.0.0.5")
    const customer = { id: "cust_2", email: "hash@example.com" }
    mockFindUnique.mockResolvedValue(customer)
    mockUpdate.mockResolvedValue(customer)

    await POST(makeRequest({ email: "hash@example.com" }))

    // Capture raw token sent to email
    const rawToken = mockSendReset.mock.calls[0][1] as string
    // Capture hashed token stored in DB
    const updateCall = mockUpdate.mock.calls[0][0]
    const storedToken = updateCall.data.passwordResetToken as string

    // They must differ (raw vs hashed)
    expect(rawToken).not.toBe(storedToken)

    // Verify the hash relationship
    const expectedHash = crypto.createHash("sha256").update(rawToken).digest("hex")
    expect(storedToken).toBe(expectedHash)
  })
})
