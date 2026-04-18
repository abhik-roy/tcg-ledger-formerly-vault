import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// next/headers must be mocked before importing the route because the route
// calls `await headers()` at runtime for IP-based rate limiting.
// ---------------------------------------------------------------------------
vi.mock("next/headers", () => ({
  headers: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
  },
}))

import { POST } from "@/app/api/register/route"
import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"
import bcrypt from "bcryptjs"

const mockFindUnique = prisma.customer.findUnique as ReturnType<typeof vi.fn>
const mockCreate = prisma.customer.create as ReturnType<typeof vi.fn>

// Meets all validation rules: ≥8 chars, contains at least one digit
const VALID_PASSWORD = "securepass1"

// Helper to create mock Request objects
const makeRequest = (body: object) =>
  ({ json: vi.fn().mockResolvedValue(body) }) as unknown as Request

// Use a unique IP per test so the module-level rate-limit map never trips
let ipSuffix = 0

describe("POST /api/register", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ipSuffix++
    // Fresh unique IP per test — avoids the 5-attempt rate-limit across tests
    vi.mocked(headers).mockResolvedValue({
      get: vi.fn().mockImplementation((key: string) => {
        if (key === "x-forwarded-for") return `10.0.0.${ipSuffix}`
        return null
      }),
    } as unknown as Awaited<ReturnType<typeof headers>>)
  })

  it("creates a customer and returns user data on valid registration", async () => {
    mockFindUnique.mockResolvedValue(null)
    mockCreate.mockResolvedValue({
      id: "cust-1",
      email: "new@example.com",
      firstName: "John",
      lastName: "Doe",
    })

    const response = await POST(
      makeRequest({
        email: "new@example.com",
        password: VALID_PASSWORD,
        name: "John Doe",
      })
    )

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.user).toEqual({
      id: "cust-1",
      email: "new@example.com",
      firstName: "John",
      lastName: "Doe",
    })
  })

  it("returns 400 when email is missing", async () => {
    const response = await POST(makeRequest({ password: VALID_PASSWORD }))

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.message).toBe("Email and password are required.")
  })

  it("returns 400 when password is missing", async () => {
    const response = await POST(makeRequest({ email: "test@test.com" }))

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.message).toBe("Email and password are required.")
  })

  it("returns 400 when email already exists", async () => {
    mockFindUnique.mockResolvedValue({ id: "existing", email: "taken@test.com" })

    const response = await POST(
      makeRequest({
        email: "taken@test.com",
        password: VALID_PASSWORD,
      })
    )

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.message).toContain("Registration failed")
  })

  it("splits a full name into firstName and lastName", async () => {
    mockFindUnique.mockResolvedValue(null)
    mockCreate.mockResolvedValue({
      id: "cust-1",
      email: "j@test.com",
      firstName: "Jane",
      lastName: "Smith",
    })

    await POST(
      makeRequest({
        email: "j@test.com",
        password: VALID_PASSWORD,
        name: "Jane Smith",
      })
    )

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        firstName: "Jane",
        lastName: "Smith",
      }),
    })
  })

  it("handles multi-word last names correctly", async () => {
    mockFindUnique.mockResolvedValue(null)
    mockCreate.mockResolvedValue({
      id: "cust-1",
      email: "j@test.com",
      firstName: "Mary",
      lastName: "Jane Watson",
    })

    await POST(
      makeRequest({
        email: "j@test.com",
        password: VALID_PASSWORD,
        name: "Mary Jane Watson",
      })
    )

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        firstName: "Mary",
        lastName: "Jane Watson",
      }),
    })
  })

  it("sets lastName to null when only a single name is provided", async () => {
    mockFindUnique.mockResolvedValue(null)
    mockCreate.mockResolvedValue({
      id: "cust-1",
      email: "mono@test.com",
      firstName: "Cher",
      lastName: null,
    })

    await POST(
      makeRequest({
        email: "mono@test.com",
        password: VALID_PASSWORD,
        name: "Cher",
      })
    )

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        firstName: "Cher",
        lastName: null,
      }),
    })
  })

  it("handles missing name gracefully (firstName and lastName both null)", async () => {
    mockFindUnique.mockResolvedValue(null)
    mockCreate.mockResolvedValue({
      id: "cust-1",
      email: "noname@test.com",
      firstName: null,
      lastName: null,
    })

    // No name field → name defaults to "" → split gives [""] → firstName="" || null = null
    await POST(
      makeRequest({
        email: "noname@test.com",
        password: VALID_PASSWORD,
      })
    )

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        firstName: null,
        lastName: null,
      }),
    })
  })

  it("hashes the password before storing", async () => {
    mockFindUnique.mockResolvedValue(null)
    mockCreate.mockResolvedValue({
      id: "cust-1",
      email: "a@b.com",
      firstName: "Test",
      lastName: null,
    })

    await POST(
      makeRequest({
        email: "a@b.com",
        password: VALID_PASSWORD,
        name: "Test",
      })
    )

    expect(bcrypt.hash).toHaveBeenCalledWith(VALID_PASSWORD, 10)
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ password: "hashed-password" }),
    })
  })

  it("returns 429 when the IP has exceeded the rate limit", async () => {
    // Pin all requests in this test to the same IP so we can exhaust the limit
    const rateLimitedIp = `10.99.0.${ipSuffix}`
    vi.mocked(headers).mockResolvedValue({
      get: vi.fn().mockReturnValue(rateLimitedIp),
    } as unknown as Awaited<ReturnType<typeof headers>>)

    mockFindUnique.mockResolvedValue(null)
    mockCreate.mockResolvedValue({
      id: "rl-cust",
      email: "rl@test.com",
      firstName: null,
      lastName: null,
    })
    // Send 5 allowed requests (MAX_ATTEMPTS = 5)
    for (let i = 0; i < 5; i++) {
      await POST(makeRequest({ email: `rl${i}@test.com`, password: VALID_PASSWORD }))
    }

    // 6th request from the same IP should be rate-limited
    const response = await POST(makeRequest({ email: "rl6@test.com", password: VALID_PASSWORD }))

    expect(response.status).toBe(429)
    const json = await response.json()
    expect(json.message).toContain("Too many registration attempts")
  })

  it("returns 500 when Prisma throws an unexpected error", async () => {
    mockFindUnique.mockRejectedValue(new Error("DB connection failed"))
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const response = await POST(
      makeRequest({
        email: "fail@test.com",
        password: VALID_PASSWORD,
      })
    )

    expect(response.status).toBe(500)
    const json = await response.json()
    expect(json.message).toBe("An unexpected error occurred. Please try again.")
    expect(consoleSpy).toHaveBeenCalledWith("REGISTRATION_ERROR", expect.any(Error))
    consoleSpy.mockRestore()
  })

  it("returns 400 for invalid email format", async () => {
    const response = await POST(makeRequest({ email: "not-an-email", password: VALID_PASSWORD }))

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.message).toBe("Please provide a valid email address.")
  })

  it("returns 400 for password shorter than 8 characters", async () => {
    const response = await POST(makeRequest({ email: "test@test.com", password: "short1" }))

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.message).toBe("Password must be between 8 and 128 characters.")
  })

  it("returns 400 for password without a number or special character", async () => {
    const response = await POST(makeRequest({ email: "test@test.com", password: "longpassword" }))

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.message).toBe("Password must contain at least one number or special character.")
  })

  it("returns 400 for name exceeding 100 characters", async () => {
    const response = await POST(
      makeRequest({
        email: "test@test.com",
        password: VALID_PASSWORD,
        name: "A".repeat(101),
      })
    )

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.message).toBe("Name must be 100 characters or fewer.")
  })

  it("returns 400 for email longer than 255 characters", async () => {
    const response = await POST(
      makeRequest({ email: `${"a".repeat(250)}@test.com`, password: VALID_PASSWORD })
    )

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.message).toBe("Please provide a valid email address.")
  })
})
