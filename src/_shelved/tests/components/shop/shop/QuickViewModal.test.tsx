import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { QuickViewModal } from "@/components/shop/QuickViewModal"
import { InventoryItemDTO } from "@/lib/dtos"

// Mock next/image to render a plain img
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { fill, unoptimized, ...rest } = props as Record<string, unknown>
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...rest} />
  },
}))

function makeItem(overrides: Partial<InventoryItemDTO> = {}): InventoryItemDTO {
  return {
    id: 1,
    cardName: "Black Lotus",
    setName: "Alpha",
    set: "lea",
    collectorNumber: "232",
    image: "https://example.com/card.png",
    quantity: 5,
    price: 999900,
    condition: "NM",
    finish: "nonfoil",
    lastUpdated: "2025-01-01",
    rarity: "Mythic Rare",
    game: "mtg",
    idealQuantity: 0,
    maxQuantity: 0,
    buyPrice: 0,
    ...overrides,
  }
}

const noopHighRes = (url?: string | null) => url ?? null

describe("QuickViewModal", () => {
  const onClose = vi.fn()
  const onAdd = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders nothing when item is null", () => {
    const { container } = render(
      <QuickViewModal
        item={null}
        open={false}
        onClose={onClose}
        onAdd={onAdd}
        getHighRes={noopHighRes}
      />
    )
    expect(container.innerHTML).toBe("")
  })

  it("displays card name, set name, price, and attributes when open", () => {
    const item = makeItem()
    render(
      <QuickViewModal
        item={item}
        open={true}
        onClose={onClose}
        onAdd={onAdd}
        getHighRes={noopHighRes}
      />
    )

    expect(screen.getByText("Black Lotus")).toBeInTheDocument()
    expect(screen.getByText("Alpha")).toBeInTheDocument()
    expect(screen.getByText("$9999.00")).toBeInTheDocument()
    expect(screen.getByText("Mythic Rare")).toBeInTheDocument()
    expect(screen.getByText("NM")).toBeInTheDocument()
    expect(screen.getByText("5 available")).toBeInTheDocument()
  })

  it("shows 'Sold out' and disables Add to Cart when quantity is 0", () => {
    const item = makeItem({ quantity: 0 })
    render(
      <QuickViewModal
        item={item}
        open={true}
        onClose={onClose}
        onAdd={onAdd}
        getHighRes={noopHighRes}
      />
    )

    expect(screen.getByText("Sold out")).toBeInTheDocument()
    const addButton = screen.getByRole("button", { name: /add to cart/i })
    expect(addButton).toBeDisabled()
  })

  it("shows low stock warning when quantity < 4", () => {
    const item = makeItem({ quantity: 2 })
    render(
      <QuickViewModal
        item={item}
        open={true}
        onClose={onClose}
        onAdd={onAdd}
        getHighRes={noopHighRes}
      />
    )

    expect(screen.getByText("Only 2 left")).toBeInTheDocument()
  })

  it("calls onAdd when Add to Cart is clicked", () => {
    const item = makeItem()
    render(
      <QuickViewModal
        item={item}
        open={true}
        onClose={onClose}
        onAdd={onAdd}
        getHighRes={noopHighRes}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /add to cart/i }))
    expect(onAdd).toHaveBeenCalledOnce()
    expect(onAdd).toHaveBeenCalledWith(item)
  })

  it("displays foil finish when not nonfoil", () => {
    const item = makeItem({ finish: "foil" })
    render(
      <QuickViewModal
        item={item}
        open={true}
        onClose={onClose}
        onAdd={onAdd}
        getHighRes={noopHighRes}
      />
    )

    expect(screen.getByText("foil")).toBeInTheDocument()
  })

  it("hides finish section when finish is nonfoil", () => {
    const item = makeItem({ finish: "nonfoil" })
    render(
      <QuickViewModal
        item={item}
        open={true}
        onClose={onClose}
        onAdd={onAdd}
        getHighRes={noopHighRes}
      />
    )

    // "Finish" label should not appear
    expect(screen.queryByText("Finish")).not.toBeInTheDocument()
  })

  it("shows 'No image' placeholder when image is null", () => {
    const item = makeItem({ image: null })
    render(
      <QuickViewModal
        item={item}
        open={true}
        onClose={onClose}
        onAdd={onAdd}
        getHighRes={noopHighRes}
      />
    )

    expect(screen.getByText("No image")).toBeInTheDocument()
  })

  it("uses getHighRes to transform image URL", () => {
    const mockHighRes = vi.fn().mockReturnValue("https://example.com/large.png")
    const item = makeItem()
    render(
      <QuickViewModal
        item={item}
        open={true}
        onClose={onClose}
        onAdd={onAdd}
        getHighRes={mockHighRes}
      />
    )

    expect(mockHighRes).toHaveBeenCalledWith("https://example.com/card.png")
    const img = screen.getByAltText("Black Lotus")
    expect(img).toHaveAttribute("src", "https://example.com/large.png")
  })
})
