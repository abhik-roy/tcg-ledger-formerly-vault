"use server"

import { HoldingService } from "@/services/holding.service"
import { LoggingService } from "@/services/logging.service"
import { requireUser, requireOwnership } from "@/lib/auth-guard"
import { revalidatePath } from "next/cache"
import type {
  ActionResult,
  CreateHoldingInput,
  UpdateHoldingInput,
  HoldingFilterInput,
} from "@/lib/types"
import type { HoldingDTO, LedgerEntryDTO } from "@/lib/dtos"

export async function getHoldings(
  filter: HoldingFilterInput = {}
): Promise<ActionResult<HoldingDTO[]>> {
  const session = await requireUser()
  try {
    const data = await HoldingService.listForUser(session.user.id, filter)
    return { success: true, data }
  } catch (error) {
    console.error("Fetch Holdings Error:", error)
    return { success: false, error: (error as Error).message }
  }
}

export async function createHolding(input: CreateHoldingInput): Promise<ActionResult<HoldingDTO>> {
  const session = await requireUser()
  try {
    const data = await HoldingService.create(session.user.id, input)
    await LoggingService.logQuantityChange({
      userId: session.user.id,
      holdingId: data.id,
      cardName: data.card.name,
      cardSet: data.card.set,
      finish: data.card.finish,
      delta: data.quantity,
      reason: "added to collection",
      actorId: session.user.id,
    })
    revalidatePath("/admin/collection")
    revalidatePath("/admin/ledger")
    revalidatePath("/admin")
    return { success: true, data }
  } catch (error) {
    console.error("Create Holding Error:", error)
    return { success: false, error: (error as Error).message }
  }
}

export async function updateHolding(
  holdingId: string,
  input: UpdateHoldingInput
): Promise<ActionResult<HoldingDTO>> {
  const session = await requireUser()
  await requireOwnership(holdingId, session.user.id)
  try {
    const before = await HoldingService.getById(holdingId)
    const data = await HoldingService.update(holdingId, input)
    if (input.quantity !== undefined && input.quantity !== before.quantity) {
      await LoggingService.logQuantityChange({
        userId: session.user.id,
        holdingId: data.id,
        cardName: data.card.name,
        cardSet: data.card.set,
        finish: data.card.finish,
        delta: data.quantity - before.quantity,
        reason: "manual update",
        actorId: session.user.id,
      })
    }
    revalidatePath("/admin/collection")
    revalidatePath("/admin/ledger")
    revalidatePath("/admin")
    return { success: true, data }
  } catch (error) {
    console.error("Update Holding Error:", error)
    return { success: false, error: (error as Error).message }
  }
}

export async function deleteHolding(holdingId: string): Promise<ActionResult<void>> {
  const session = await requireUser()
  await requireOwnership(holdingId, session.user.id)
  try {
    const before = await HoldingService.getById(holdingId)
    await HoldingService.delete(holdingId)
    await LoggingService.logQuantityChange({
      userId: session.user.id,
      holdingId: null,
      cardName: before.card.name,
      cardSet: before.card.set,
      finish: before.card.finish,
      delta: -before.quantity,
      reason: "removed from collection",
      actorId: session.user.id,
    })
    revalidatePath("/admin/collection")
    revalidatePath("/admin/ledger")
    revalidatePath("/admin")
    return { success: true, data: undefined }
  } catch (error) {
    console.error("Delete Holding Error:", error)
    return { success: false, error: (error as Error).message }
  }
}

export async function toggleTradeListingAction(
  holdingId: string,
  listedQuantity: number,
  notes?: string,
  askType?: string | null,
  askValue?: number | null
): Promise<ActionResult<HoldingDTO>> {
  const session = await requireUser()
  await requireOwnership(holdingId, session.user.id)
  try {
    const data = await HoldingService.toggleListing(
      holdingId,
      listedQuantity,
      notes,
      askType,
      askValue
    )
    revalidatePath("/admin/collection")
    revalidatePath("/admin/trade-binder")
    return { success: true, data }
  } catch (error) {
    console.error("Toggle Trade Listing Error:", error)
    return { success: false, error: (error as Error).message }
  }
}

export async function getLedgerEntries(params?: {
  startDate?: string
  endDate?: string
}): Promise<LedgerEntryDTO[]> {
  await requireUser()
  try {
    const end = params?.endDate ? new Date(params.endDate) : new Date()
    const start = params?.startDate
      ? new Date(params.startDate)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)
    return await LoggingService.listAllInRange(start, end)
  } catch (error) {
    console.error("Ledger Fetch Error:", error)
    return []
  }
}
