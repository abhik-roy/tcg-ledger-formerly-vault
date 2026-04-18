import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("next-auth/jwt", () => ({
  getToken: vi.fn(),
}))

import { middleware } from "@/middleware"
import { getToken } from "next-auth/jwt"
import { NextRequest } from "next/server"

const mockGetToken = getToken as ReturnType<typeof vi.fn>

// Helper to create NextRequest for a given path
const makeRequest = (path: string) => new NextRequest(new URL(path, "http://localhost:3000"))

describe("middleware", () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Admin routes: authorized access ───────────────────────────────────

  it("allows ADMIN to access /admin/inventory", async () => {
    mockGetToken.mockResolvedValue({ role: "ADMIN" })

    const response = await middleware(makeRequest("/admin/inventory"))

    // NextResponse.next() does not set a Location header
    expect(response.headers.get("location")).toBeNull()
  })

  it("allows TEAM to access /admin/inventory", async () => {
    mockGetToken.mockResolvedValue({ role: "TEAM" })

    const response = await middleware(makeRequest("/admin/inventory"))

    expect(response.headers.get("location")).toBeNull()
  })

  // ── Admin routes: unauthenticated ─────────────────────────────────────

  it("redirects unauthenticated user from /admin/inventory to /admin/login with callbackUrl", async () => {
    mockGetToken.mockResolvedValue(null)

    const response = await middleware(makeRequest("/admin/inventory"))

    expect(response.status).toBe(307)
    const location = response.headers.get("location")!
    expect(location).toContain("/admin/login")
    expect(location).toContain("callbackUrl=%2Fadmin%2Finventory")
  })

  it("redirects unauthenticated user from /admin/orders to /admin/login with callbackUrl", async () => {
    mockGetToken.mockResolvedValue(null)

    const response = await middleware(makeRequest("/admin/orders"))

    expect(response.status).toBe(307)
    const location = response.headers.get("location")!
    expect(location).toContain("/admin/login")
    expect(location).toContain("callbackUrl=%2Fadmin%2Forders")
  })

  // ── Admin routes: CUSTOMER role blocked ───────────────────────────────

  it("redirects CUSTOMER from /admin/inventory to /", async () => {
    mockGetToken.mockResolvedValue({ role: "CUSTOMER" })
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {})

    const response = await middleware(makeRequest("/admin/inventory"))

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toContain("http://localhost:3000/")
    // Make sure it does NOT redirect to /admin/login (it should go to /)
    expect(response.headers.get("location")).not.toContain("/admin/login")
    consoleSpy.mockRestore()
  })

  // ── Admin routes: unknown role blocked ────────────────────────────────

  it("redirects a user with an unknown role from /admin/inventory to /", async () => {
    mockGetToken.mockResolvedValue({ role: "UNKNOWN_ROLE" })

    const response = await middleware(makeRequest("/admin/inventory"))

    expect(response.status).toBe(307)
    const location = response.headers.get("location")!
    expect(location).toBe("http://localhost:3000/")
  })

  // ── Admin login page ──────────────────────────────────────────────────

  it("allows unauthenticated user to access /admin/login", async () => {
    mockGetToken.mockResolvedValue(null)

    const response = await middleware(makeRequest("/admin/login"))

    expect(response.headers.get("location")).toBeNull()
  })

  it("redirects already-authenticated ADMIN from /admin/login to /admin/inventory", async () => {
    mockGetToken.mockResolvedValue({ role: "ADMIN" })

    const response = await middleware(makeRequest("/admin/login"))

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toContain("/admin/inventory")
  })

  it("redirects already-authenticated TEAM from /admin/login to /admin/inventory", async () => {
    mockGetToken.mockResolvedValue({ role: "TEAM" })

    const response = await middleware(makeRequest("/admin/login"))

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toContain("/admin/inventory")
  })

  it("allows CUSTOMER to view /admin/login (not staff, passes through login exception)", async () => {
    mockGetToken.mockResolvedValue({ role: "CUSTOMER" })

    const response = await middleware(makeRequest("/admin/login"))

    // CUSTOMER is not staff, so isStaff is false, so it returns NextResponse.next()
    expect(response.headers.get("location")).toBeNull()
  })

  // ── Non-admin routes ──────────────────────────────────────────────────

  it("allows unauthenticated user to access non-admin paths", async () => {
    mockGetToken.mockResolvedValue(null)

    const response = await middleware(makeRequest("/shop/browse"))

    expect(response.headers.get("location")).toBeNull()
  })

  it("allows any authenticated user to access non-admin paths", async () => {
    mockGetToken.mockResolvedValue({ role: "CUSTOMER" })

    const response = await middleware(makeRequest("/shop/profile"))

    expect(response.headers.get("location")).toBeNull()
  })

  it("allows access to the root path without authentication", async () => {
    mockGetToken.mockResolvedValue(null)

    const response = await middleware(makeRequest("/"))

    expect(response.headers.get("location")).toBeNull()
  })
})
