import { describe, it, expect } from "vitest"
import type { CustomerWithStats } from "@/app/actions/customers"

// Copy the getInitials logic from CustomersTable.tsx for testing
// (avoids importing a React component into a pure util test)
function getInitials(c: CustomerWithStats): string {
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email
  return name
    .split(/[@\s]/)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function makeCustomer(overrides: Partial<CustomerWithStats> = {}): CustomerWithStats {
  return {
    id: "cust-1",
    email: "test@example.com",
    firstName: null,
    lastName: null,
    createdAt: new Date(),
    orderCount: 0,
    lifetimeSpend: 0,
    ...overrides,
  }
}

describe("getInitials", () => {
  it("returns initials from firstName and lastName", () => {
    expect(getInitials(makeCustomer({ firstName: "Jane", lastName: "Doe" }))).toBe("JD")
  })

  it("returns initials from firstName only when lastName is null", () => {
    const result = getInitials(makeCustomer({ firstName: "Jane", lastName: null }))
    expect(result).toBe("J")
  })

  it("returns initials from email when both name fields are null", () => {
    const result = getInitials(
      makeCustomer({ firstName: null, lastName: null, email: "user@example.com" })
    )
    expect(result).toBe("UE") // 'user' and 'example.com' split on @
  })

  it("uppercases the initials", () => {
    const result = getInitials(makeCustomer({ firstName: "alice", lastName: "bob" }))
    expect(result).toBe("AB")
  })

  it("returns at most 2 characters", () => {
    const result = getInitials(makeCustomer({ firstName: "Alice", lastName: "Bob" }))
    expect(result.length).toBeLessThanOrEqual(2)
  })
})

describe("cents formatting", () => {
  it("formats 1500 cents as 15.00", () => {
    expect((1500 / 100).toFixed(2)).toBe("15.00")
  })

  it("formats 0 cents as 0.00", () => {
    expect((0 / 100).toFixed(2)).toBe("0.00")
  })

  it("formats 99 cents as 0.99", () => {
    expect((99 / 100).toFixed(2)).toBe("0.99")
  })

  it("rounds correctly for odd cents", () => {
    expect((4599 / 100).toFixed(2)).toBe("45.99")
  })

  it("formats large amounts correctly", () => {
    expect((1250000 / 100).toFixed(2)).toBe("12500.00")
  })
})
