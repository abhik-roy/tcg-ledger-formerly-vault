import { describe, it, expect } from "vitest"
import {
  toInventoryItemDTO,
  toBuylistItemDTO,
  toBuylistOverviewStats,
  toPOSInventoryItemDTO,
} from "@/mappers/inventory.mapper"
import type { InventoryRow, BuylistRow, POSRow } from "@/mappers/inventory.mapper"

// -- Fixtures -----------------------------------------------------------------

function makeInventoryRow(overrides: Partial<InventoryRow> = {}): InventoryRow {
  return {
    id: 1,
    name: "Black Lotus",
    setname: "Alpha",
    set: "LEA",
    collectornumber: "232",
    quantity: 3,
    storeprice: 100000,
    condition: "NM",
    finish: "nonfoil",
    updatedat: new Date("2024-06-01T12:00:00.000Z"),
    rarity: "Rare",
    game: "magic",
    imagesmall: "http://small.jpg",
    imagenormal: "http://normal.jpg",
    idealQuantity: 5,
    maxQuantity: 10,
    buyPrice: 5000,
    ...overrides,
  }
}

function makeBuylistRow(overrides: Partial<BuylistRow> = {}): BuylistRow {
  return {
    id: 1,
    name: "Black Lotus",
    setname: "Alpha",
    condition: "NM",
    finish: "nonfoil",
    imagesmall: "http://small.jpg",
    imagenormal: "http://normal.jpg",
    quantity: 3,
    storeprice: 100000,
    buyPrice: 5000,
    idealQuantity: 5,
    maxQuantity: 10,
    ...overrides,
  }
}

function makePOSRow(overrides: Partial<POSRow> = {}): POSRow {
  return {
    id: 1,
    name: "Lightning Bolt",
    setname: "Alpha",
    condition: "NM",
    finish: "nonfoil",
    storeprice: 500,
    quantity: 10,
    imagesmall: "http://small.jpg",
    imagenormal: "http://normal.jpg",
    ...overrides,
  }
}

// -- toInventoryItemDTO -------------------------------------------------------

describe("toInventoryItemDTO", () => {
  it("maps all fields correctly from a complete row", () => {
    const row = makeInventoryRow()
    const dto = toInventoryItemDTO(row)

    expect(dto.id).toBe(1)
    expect(dto.cardName).toBe("Black Lotus")
    expect(dto.setName).toBe("Alpha")
    expect(dto.set).toBe("LEA")
    expect(dto.collectorNumber).toBe("232")
    expect(dto.image).toBe("http://small.jpg") // imagesmall takes priority for inventory
    expect(dto.quantity).toBe(3)
    expect(dto.price).toBe(100000)
    expect(dto.condition).toBe("NM")
    expect(dto.finish).toBe("nonfoil")
    expect(dto.lastUpdated).toBe("2024-06-01T12:00:00.000Z")
    expect(dto.rarity).toBe("Rare")
    expect(dto.game).toBe("magic")
    expect(dto.idealQuantity).toBe(5)
    expect(dto.maxQuantity).toBe(10)
    expect(dto.buyPrice).toBe(5000)
  })

  it("passes through zero quantity", () => {
    const dto = toInventoryItemDTO(makeInventoryRow({ quantity: 0 }))
    expect(dto.quantity).toBe(0)
  })

  it("passes through zero storeprice", () => {
    const dto = toInventoryItemDTO(makeInventoryRow({ storeprice: 0 }))
    expect(dto.price).toBe(0)
  })

  it("defaults null condition to NM", () => {
    const dto = toInventoryItemDTO(makeInventoryRow({ condition: null }))
    expect(dto.condition).toBe("NM")
  })

  it("defaults null finish field to nonfoil", () => {
    const dto = toInventoryItemDTO(makeInventoryRow({ finish: null }))
    expect(dto.finish).toBe("nonfoil")
  })

  it("defaults empty setname to Unknown Set", () => {
    const dto = toInventoryItemDTO(makeInventoryRow({ setname: "" }))
    expect(dto.setName).toBe("Unknown Set")
  })

  it("defaults null game to magic", () => {
    const dto = toInventoryItemDTO(makeInventoryRow({ game: null }))
    expect(dto.game).toBe("magic")
  })

  it("defaults null rarity to null", () => {
    const dto = toInventoryItemDTO(makeInventoryRow({ rarity: null as unknown as string }))
    expect(dto.rarity).toBeNull()
  })

  it("uses imagesmall when both images are present (inventory prefers small)", () => {
    const dto = toInventoryItemDTO(
      makeInventoryRow({ imagesmall: "http://small.jpg", imagenormal: "http://normal.jpg" })
    )
    expect(dto.image).toBe("http://small.jpg")
  })

  it("falls back to imagenormal when imagesmall is null", () => {
    const dto = toInventoryItemDTO(makeInventoryRow({ imagesmall: null }))
    expect(dto.image).toBe("http://normal.jpg")
  })

  it("returns null image when both image fields are null", () => {
    const dto = toInventoryItemDTO(makeInventoryRow({ imagesmall: null, imagenormal: null }))
    expect(dto.image).toBeNull()
  })
})

// -- toBuylistItemDTO ---------------------------------------------------------

describe("toBuylistItemDTO", () => {
  it("maps all fields correctly", () => {
    const dto = toBuylistItemDTO(makeBuylistRow())

    expect(dto.id).toBe(1)
    expect(dto.cardName).toBe("Black Lotus")
    expect(dto.setName).toBe("Alpha")
    expect(dto.condition).toBe("NM")
    expect(dto.finish).toBe("nonfoil")
    expect(dto.currentStock).toBe(3)
    expect(dto.storePrice).toBe(100000)
    expect(dto.buyPrice).toBe(5000)
    expect(dto.idealQuantity).toBe(5)
    expect(dto.maxQuantity).toBe(10)
  })

  it("uses imagenormal over imagesmall for the image field", () => {
    const dto = toBuylistItemDTO(
      makeBuylistRow({ imagenormal: "http://normal.jpg", imagesmall: "http://small.jpg" })
    )
    expect(dto.image).toBe("http://normal.jpg")
  })

  it("falls back to imagesmall when imagenormal is null", () => {
    const dto = toBuylistItemDTO(makeBuylistRow({ imagenormal: null }))
    expect(dto.image).toBe("http://small.jpg")
  })

  it("returns null image when both image fields are null", () => {
    const dto = toBuylistItemDTO(makeBuylistRow({ imagenormal: null, imagesmall: null }))
    expect(dto.image).toBeNull()
  })

  it("passes through zero quantity in currentStock", () => {
    const dto = toBuylistItemDTO(makeBuylistRow({ quantity: 0 }))
    expect(dto.currentStock).toBe(0)
  })

  it("defaults null condition to NM", () => {
    const dto = toBuylistItemDTO(makeBuylistRow({ condition: null }))
    expect(dto.condition).toBe("NM")
  })

  it("defaults null finish field to nonfoil", () => {
    const dto = toBuylistItemDTO(makeBuylistRow({ finish: null }))
    expect(dto.finish).toBe("nonfoil")
  })

  it("passes through zero storeprice", () => {
    const dto = toBuylistItemDTO(makeBuylistRow({ storeprice: 0 }))
    expect(dto.storePrice).toBe(0)
  })
})

// -- toBuylistOverviewStats ---------------------------------------------------

describe("toBuylistOverviewStats", () => {
  it("converts bigint values to numbers", () => {
    const stats = toBuylistOverviewStats({
      total_on_buylist: BigInt(42),
      needing_restock: BigInt(10),
      at_capacity: BigInt(3),
    })

    expect(stats.totalOnBuylist).toBe(42)
    expect(stats.needingRestock).toBe(10)
    expect(stats.atCapacity).toBe(3)
  })

  it("handles zero bigints correctly", () => {
    const stats = toBuylistOverviewStats({
      total_on_buylist: BigInt(0),
      needing_restock: BigInt(0),
      at_capacity: BigInt(0),
    })

    expect(stats.totalOnBuylist).toBe(0)
    expect(stats.needingRestock).toBe(0)
    expect(stats.atCapacity).toBe(0)
  })

  it("handles large bigint values", () => {
    const stats = toBuylistOverviewStats({
      total_on_buylist: BigInt(999999),
      needing_restock: BigInt(500000),
      at_capacity: BigInt(100000),
    })

    expect(stats.totalOnBuylist).toBe(999999)
    expect(stats.needingRestock).toBe(500000)
    expect(stats.atCapacity).toBe(100000)
  })
})

// -- toPOSInventoryItemDTO ----------------------------------------------------

describe("toPOSInventoryItemDTO", () => {
  it("maps all fields correctly", () => {
    const dto = toPOSInventoryItemDTO(makePOSRow())

    expect(dto.id).toBe(1)
    expect(dto.name).toBe("Lightning Bolt")
    expect(dto.setName).toBe("Alpha")
    expect(dto.condition).toBe("NM")
    expect(dto.finish).toBe("nonfoil")
    expect(dto.price).toBe(500)
    expect(dto.quantity).toBe(10)
  })

  it("uses imagenormal over imagesmall for the image field", () => {
    const dto = toPOSInventoryItemDTO(
      makePOSRow({ imagenormal: "http://normal.jpg", imagesmall: "http://small.jpg" })
    )
    expect(dto.image).toBe("http://normal.jpg")
  })

  it("falls back to imagesmall when imagenormal is null", () => {
    const dto = toPOSInventoryItemDTO(makePOSRow({ imagenormal: null }))
    expect(dto.image).toBe("http://small.jpg")
  })

  it("returns null image when both image fields are null", () => {
    const dto = toPOSInventoryItemDTO(makePOSRow({ imagenormal: null, imagesmall: null }))
    expect(dto.image).toBeNull()
  })

  it("defaults null condition to NM", () => {
    const dto = toPOSInventoryItemDTO(makePOSRow({ condition: null }))
    expect(dto.condition).toBe("NM")
  })

  it("defaults null finish field to nonfoil", () => {
    const dto = toPOSInventoryItemDTO(makePOSRow({ finish: null }))
    expect(dto.finish).toBe("nonfoil")
  })

  it("passes through zero storeprice", () => {
    const dto = toPOSInventoryItemDTO(makePOSRow({ storeprice: 0 }))
    expect(dto.price).toBe(0)
  })

  it("passes through zero quantity", () => {
    const dto = toPOSInventoryItemDTO(makePOSRow({ quantity: 0 }))
    expect(dto.quantity).toBe(0)
  })

  it("defaults empty setname to empty string", () => {
    const dto = toPOSInventoryItemDTO(makePOSRow({ setname: "" }))
    expect(dto.setName).toBe("")
  })
})
