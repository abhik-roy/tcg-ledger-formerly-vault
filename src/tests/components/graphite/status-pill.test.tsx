import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { StatusPill } from "@/components/ui/graphite/status-pill"

describe("StatusPill", () => {
  it.each(["pending", "accepted", "declined", "withdrawn", "voided"] as const)(
    "renders a chip for status %s",
    (status) => {
      render(<StatusPill status={status} />)
      expect(screen.getByText(new RegExp(status, "i"))).toBeInTheDocument()
    }
  )
  it("falls back to a neutral chip for unknown status", () => {
    render(<StatusPill status={"unknown-weird"} />)
    expect(screen.getByText(/unknown/i)).toBeInTheDocument()
  })
})
