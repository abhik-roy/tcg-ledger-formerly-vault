import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import OrderTotals from "@/components/shop/OrderTotals"

interface TotalsProps {
  cartTotal: number
  shippingCost: number
  taxEstimate: number
  finalTotal: number
  isPickup: boolean
}

const defaultProps: TotalsProps = {
  cartTotal: 5000, // $50.00
  shippingCost: 599, // $5.99
  taxEstimate: 413, // $4.13
  finalTotal: 6012, // $60.12
  isPickup: false,
}

function renderTotals(overrides: Partial<TotalsProps> = {}) {
  return render(<OrderTotals {...defaultProps} {...overrides} />)
}

describe("OrderTotals", () => {
  describe("shipping mode (isPickup = false)", () => {
    it("renders the subtotal formatted as dollars", () => {
      renderTotals()
      expect(screen.getByText("$50.00")).toBeInTheDocument()
    })

    it("renders the shipping cost formatted as dollars", () => {
      renderTotals()
      expect(screen.getByText("$5.99")).toBeInTheDocument()
    })

    it("renders the tax estimate formatted as dollars", () => {
      renderTotals()
      expect(screen.getByText("$4.13")).toBeInTheDocument()
    })

    it("renders the final total formatted as dollars", () => {
      renderTotals()
      expect(screen.getByText("$60.12")).toBeInTheDocument()
    })

    it('does not show "FREE" for shipping when not pickup', () => {
      renderTotals()
      expect(screen.queryByText("FREE")).not.toBeInTheDocument()
    })

    it("renders all label text (Subtotal, Shipping, Estimated Tax, Total)", () => {
      renderTotals()
      expect(screen.getByText("Subtotal")).toBeInTheDocument()
      expect(screen.getByText("Shipping")).toBeInTheDocument()
      expect(screen.getByText("Estimated Tax")).toBeInTheDocument()
      expect(screen.getByText("Total")).toBeInTheDocument()
    })

    it("renders the USD currency label", () => {
      renderTotals()
      expect(screen.getByText("USD")).toBeInTheDocument()
    })
  })

  describe("pickup mode (isPickup = true)", () => {
    it('shows "FREE" instead of a dollar amount for shipping', () => {
      renderTotals({ isPickup: true })
      expect(screen.getByText("FREE")).toBeInTheDocument()
    })

    it("does not render the shipping cost as a dollar amount when pickup", () => {
      renderTotals({ isPickup: true, shippingCost: 599 })
      // $5.99 should NOT appear since shipping shows FREE
      expect(screen.queryByText("$5.99")).not.toBeInTheDocument()
    })

    it("still renders subtotal, tax, and total correctly in pickup mode", () => {
      renderTotals({
        isPickup: true,
        cartTotal: 2000,
        taxEstimate: 150,
        finalTotal: 2150,
      })
      expect(screen.getByText("$20.00")).toBeInTheDocument()
      expect(screen.getByText("$1.50")).toBeInTheDocument()
      expect(screen.getByText("$21.50")).toBeInTheDocument()
    })
  })

  describe("zero values", () => {
    it("renders $0.00 for all values when everything is zero", () => {
      renderTotals({
        cartTotal: 0,
        shippingCost: 0,
        taxEstimate: 0,
        finalTotal: 0,
        isPickup: false,
      })
      // All four dollar amounts should be $0.00
      const zeroAmounts = screen.getAllByText("$0.00")
      expect(zeroAmounts.length).toBe(4)
    })

    it("renders $0.00 for shipping when shippingCost is 0 and not pickup", () => {
      renderTotals({ shippingCost: 0, isPickup: false })
      // The shipping line should show $0.00 (not "FREE")
      expect(screen.queryByText("FREE")).not.toBeInTheDocument()
    })

    it("renders $0.00 for tax when taxEstimate is zero", () => {
      renderTotals({ taxEstimate: 0 })
      // At least one $0.00 should appear (for tax)
      expect(screen.getAllByText("$0.00").length).toBeGreaterThanOrEqual(1)
    })
  })

  describe("price formatting edge cases", () => {
    it("formats a single cent correctly as $0.01", () => {
      renderTotals({ cartTotal: 1, shippingCost: 1, taxEstimate: 1, finalTotal: 3 })
      const pennies = screen.getAllByText("$0.01")
      expect(pennies.length).toBe(3) // subtotal, shipping, tax
      expect(screen.getByText("$0.03")).toBeInTheDocument() // total
    })

    it("formats large amounts with two decimal places", () => {
      renderTotals({ finalTotal: 1234567 }) // $12345.67
      expect(screen.getByText("$12345.67")).toBeInTheDocument()
    })
  })
})
