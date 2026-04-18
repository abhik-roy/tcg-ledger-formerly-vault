"use server"

import { requireUser } from "@/lib/auth-guard"
import { CatalogService } from "@/services/catalog.service"
import { HoldingService } from "@/services/holding.service"
import type { ActionResult, CreateCardInput, CreateHoldingInput } from "@/lib/types"
import type { CardDTO, HoldingDTO } from "@/lib/dtos"
import { revalidatePath } from "next/cache"

export type ScryfallMatch = {
  id: string
  name: string
  set: string
  setName: string
  collectorNumber: string
  image: string | null
  price: number
  versions: { set: string; setName: string; id: string; price: number; image: string | null }[]
}

/**
 * Identifies a card by querying the Scryfall API.
 */
export async function identifyCardAction(
  name: string,
  setCode?: string
): Promise<ScryfallMatch | null> {
  await requireUser()
  try {
    const query = `!"${name}" unique:prints`
    const res = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}`)

    if (!res.ok) return null

    const data = await res.json()
    if (!data.data || data.data.length === 0) return null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let bestMatch: any = data.data[0]

    if (setCode) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const found = data.data.find((c: any) => c.set.toLowerCase() === setCode.toLowerCase())
      if (found) bestMatch = found
    }

    const versions = data.data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((card: any) => ({
        set: card.set.toUpperCase(),
        setName: card.set_name,
        id: card.id,
        price: parseFloat(card.prices?.usd || card.prices?.usd_foil || "0"),
        image: card.image_uris?.normal || card.image_uris?.small || null,
      }))
      .slice(0, 50)

    return {
      id: bestMatch.id,
      name: bestMatch.name,
      set: bestMatch.set.toUpperCase(),
      setName: bestMatch.set_name,
      collectorNumber: bestMatch.collector_number,
      image: bestMatch.image_uris?.normal || bestMatch.image_uris?.small || null,
      price: parseFloat(bestMatch.prices?.usd || bestMatch.prices?.usd_foil || "0"),
      versions: versions,
    }
  } catch (err) {
    console.error("Scryfall Identify Error:", err)
    return null
  }
}

/**
 * Upserts a card in the catalog and creates a holding for the current user.
 */
export async function addCardToCollection(
  cardInput: CreateCardInput,
  holdingInput: Omit<CreateHoldingInput, "cardId">
): Promise<ActionResult<HoldingDTO>> {
  const session = await requireUser()
  try {
    const card = await CatalogService.upsertCard(cardInput)
    const holding = await HoldingService.create(session.user.id, {
      ...holdingInput,
      cardId: card.id,
    })
    revalidatePath("/admin/collection")
    revalidatePath("/admin")
    return { success: true, data: holding }
  } catch (error) {
    console.error("Add Card to Collection Error:", error)
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Searches the card catalog.
 */
export async function searchCatalogAction(query: string): Promise<CardDTO[]> {
  await requireUser()
  try {
    const cleanQuery = query.trim()
    return await CatalogService.search(cleanQuery)
  } catch (error) {
    console.error("Catalog Search Error:", error)
    return []
  }
}
