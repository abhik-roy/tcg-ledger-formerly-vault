import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import type { CartItem } from "@/context/cart-context"

// Mock next/image to render a plain <img> so we can assert on src/alt
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img {...props} />
  ),
}))

import OrderItemList from "@/components/shop/OrderItemList"

function makeItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: 1,
    cartQuantity: 1,
    name: "Black Lotus",
    setName: "Alpha",
    price: 99999,
    image: "https://example.com/lotus.jpg",
    condition: "NM",
    finish: "Non-foil",
    originalQuantity: 4,
    ...overrides,
  }
}

describe("OrderItemList", () => {
  describe("rendering a single item", () => {
    it("displays the item name", () => {
      render(<OrderItemList items={[makeItem()]} />)
      expect(screen.getByText("Black Lotus")).toBeInTheDocument()
    })

    it("displays the set name", () => {
      render(<OrderItemList items={[makeItem({ setName: "Unlimited" })]} />)
      expect(screen.getByText(/Unlimited/)).toBeInTheDocument()
    })

    it("displays the quantity badge", () => {
      render(<OrderItemList items={[makeItem({ cartQuantity: 3 })]} />)
      expect(screen.getByText("3")).toBeInTheDocument()
    })

    it("displays the line total formatted as dollars (price * quantity / 100)", () => {
      // price=1500 (cents), qty=2 => $30.00
      render(<OrderItemList items={[makeItem({ price: 1500, cartQuantity: 2 })]} />)
      expect(screen.getByText("$30.00")).toBeInTheDocument()
    })

    it("renders the item image with correct src and alt", () => {
      render(<OrderItemList items={[makeItem()]} />)
      const img = screen.getByAltText("Black Lotus") as HTMLImageElement
      expect(img).toBeInTheDocument()
      expect(img.getAttribute("src")).toBe("https://example.com/lotus.jpg")
    })

    it('renders a "No Image" placeholder when image is null', () => {
      render(<OrderItemList items={[makeItem({ image: null })]} />)
      expect(screen.getByText("No Image")).toBeInTheDocument()
      expect(screen.queryByRole("img")).not.toBeInTheDocument()
    })
  })

  describe("rendering multiple items", () => {
    it("renders all items with their respective names", () => {
      const items = [
        makeItem({ id: 1, name: "Black Lotus", setName: "Alpha" }),
        makeItem({ id: 2, name: "Mox Pearl", setName: "Beta" }),
        makeItem({ id: 3, name: "Ancestral Recall", setName: "Unlimited" }),
      ]
      render(<OrderItemList items={items} />)

      expect(screen.getByText("Black Lotus")).toBeInTheDocument()
      expect(screen.getByText("Mox Pearl")).toBeInTheDocument()
      expect(screen.getByText("Ancestral Recall")).toBeInTheDocument()
    })

    it("renders correct line totals for each item independently", () => {
      const items = [
        makeItem({ id: 1, name: "Card A", price: 500, cartQuantity: 1 }), // $5.00
        makeItem({ id: 2, name: "Card B", price: 1250, cartQuantity: 4 }), // $50.00
      ]
      render(<OrderItemList items={items} />)

      expect(screen.getByText("$5.00")).toBeInTheDocument()
      expect(screen.getByText("$50.00")).toBeInTheDocument()
    })
  })

  describe("empty state", () => {
    it("renders an empty container when items array is empty", () => {
      const { container } = render(<OrderItemList items={[]} />)
      // The root div exists but has no children
      const root = container.firstChild as HTMLElement
      expect(root).toBeInTheDocument()
      expect(root.children.length).toBe(0)
    })
  })

  describe("price formatting edge cases", () => {
    it("formats a single cent correctly as $0.01", () => {
      render(<OrderItemList items={[makeItem({ price: 1, cartQuantity: 1 })]} />)
      expect(screen.getByText("$0.01")).toBeInTheDocument()
    })

    it("formats zero price as $0.00", () => {
      render(<OrderItemList items={[makeItem({ price: 0, cartQuantity: 1 })]} />)
      expect(screen.getByText("$0.00")).toBeInTheDocument()
    })

    it("formats large totals with two decimal places", () => {
      // 99999 cents * 3 = 299997 cents = $2999.97
      render(<OrderItemList items={[makeItem({ price: 99999, cartQuantity: 3 })]} />)
      expect(screen.getByText("$2,999.97")).toBeInTheDocument()
    })
  })
})
