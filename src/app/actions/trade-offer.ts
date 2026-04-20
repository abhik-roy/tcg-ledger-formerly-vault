"use server"

/**
 * @file trade-offer.ts
 * @module actions/trade-offer
 * @description
 *   Server Action controller for trade offers (make/accept/decline/withdraw/void).
 *
 * @layer Controller
 */

import { requireUser } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"
import { TradeOfferRepository } from "@/repositories/trade-offer.repository"
import { toTradeOfferDTO } from "@/mappers/trade-binder.mapper"
import { LoggingService } from "@/services/logging.service"
import { EmailService } from "@/services/email.service"
import { revalidatePath } from "next/cache"
import type { ActionResult, MakeOfferInput } from "@/lib/types"
import type { TradeOfferDTO } from "@/lib/dtos"

/**
 * Make a trade offer on a listed holding.
 */
export async function makeOffer(input: MakeOfferInput): Promise<ActionResult<TradeOfferDTO>> {
  const session = await requireUser()
  const userId = session.user.id

  try {
    // Validate the target holding
    const holding = await prisma.holding.findUnique({
      where: { id: input.holdingId },
      select: {
        userId: true,
        listedForTrade: true,
        card: { select: { name: true } },
        user: { select: { email: true, displayName: true } },
      },
    })

    if (!holding) {
      return { success: false, error: "Holding not found" }
    }
    if (!holding.listedForTrade) {
      return { success: false, error: "This card is not listed for trade" }
    }
    if (holding.userId === userId) {
      return { success: false, error: "You cannot make an offer on your own listing" }
    }

    // Check for existing pending offer
    const existing = await TradeOfferRepository.findPendingByHoldingAndUser(input.holdingId, userId)
    if (existing) {
      return { success: false, error: "You already have a pending offer on this listing" }
    }

    // Validate offered cards belong to the offerer and are listed
    if (input.cards.length > 0) {
      const offeredHoldings = await prisma.holding.findMany({
        where: {
          id: { in: input.cards.map((c) => c.holdingId) },
          userId,
        },
        select: { id: true, quantity: true },
      })
      const holdingMap = new Map(offeredHoldings.map((h) => [h.id, h]))

      for (const card of input.cards) {
        const h = holdingMap.get(card.holdingId)
        if (!h) {
          return { success: false, error: "One of the offered cards does not belong to you" }
        }
        if (card.quantity > h.quantity) {
          return {
            success: false,
            error: "You don't have enough quantity for one of the offered cards",
          }
        }
      }
    }

    // Require at least some value in the offer
    if (input.cashAmount <= 0 && input.cards.length === 0) {
      return { success: false, error: "Offer must include cash or cards" }
    }

    const row = await TradeOfferRepository.create({
      holdingId: input.holdingId,
      offerUserId: userId,
      cashAmount: input.cashAmount,
      message: input.message,
      offeredCards: input.cards,
    })

    // Fire-and-forget email notification
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true, email: true },
    })
    EmailService.sendNewOfferNotification({
      ownerEmail: holding.user.email,
      cardName: holding.card.name,
      offerorName: user?.displayName ?? user?.email ?? "Someone",
      cashAmount: input.cashAmount,
      cardCount: input.cards.length,
    })

    revalidatePath("/admin/trade-binder")
    return { success: true, data: toTradeOfferDTO(row) }
  } catch (error) {
    console.error("Make Offer Error:", error)
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Accept a trade offer. Must own the listing.
 * Executes the trade in a transaction: transfers quantities and creates holdings.
 */
export async function acceptOffer(
  offerId: string,
  message?: string
): Promise<ActionResult<TradeOfferDTO>> {
  const session = await requireUser()
  const userId = session.user.id

  try {
    const offer = await TradeOfferRepository.findById(offerId)
    if (!offer) {
      return { success: false, error: "Offer not found" }
    }
    if (offer.holding.userId !== userId) {
      return { success: false, error: "You can only accept offers on your own listings" }
    }
    if (offer.status !== "pending") {
      return { success: false, error: `Cannot accept an offer that is ${offer.status}` }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Decrement the listed holding's quantity (transfer to offerer)
      const listedHolding = await tx.holding.update({
        where: { id: offer.holdingId },
        data: {
          quantity: { decrement: 1 },
          listedQuantity: { decrement: 1 },
        },
        include: { card: true },
      })

      // If quantity hits 0, unlist
      if (listedHolding.quantity <= 0 || listedHolding.listedQuantity <= 0) {
        await tx.holding.update({
          where: { id: offer.holdingId },
          data: {
            listedForTrade: listedHolding.quantity <= 0 ? false : listedHolding.listedForTrade,
            listedQuantity: Math.max(0, listedHolding.listedQuantity),
          },
        })
      }

      // 2. Create/upsert the listed card into the offerer's collection
      await tx.holding.upsert({
        where: {
          user_printing_condition: {
            userId: offer.offerUserId,
            cardId: listedHolding.cardId,
            condition: listedHolding.condition,
          },
        },
        create: {
          userId: offer.offerUserId,
          cardId: listedHolding.cardId,
          condition: listedHolding.condition,
          quantity: 1,
        },
        update: {
          quantity: { increment: 1 },
        },
      })

      // Log the listed card transfer
      await LoggingService.logQuantityChange({
        userId,
        holdingId: offer.holdingId,
        cardName: listedHolding.card.name,
        cardSet: listedHolding.card.set,
        finish: listedHolding.card.finish,
        delta: -1,
        reason: `traded to ${offer.offerUser.displayName ?? offer.offerUser.email} (offer accepted)`,
        actorId: userId,
      })

      // 3. Transfer each offered card: decrement offerer, increment owner
      for (const offeredCard of offer.offeredCards) {
        const offeredHolding = await tx.holding.update({
          where: { id: offeredCard.holdingId },
          data: { quantity: { decrement: offeredCard.quantity } },
          include: { card: true },
        })

        await tx.holding.upsert({
          where: {
            user_printing_condition: {
              userId,
              cardId: offeredHolding.cardId,
              condition: offeredHolding.condition,
            },
          },
          create: {
            userId,
            cardId: offeredHolding.cardId,
            condition: offeredHolding.condition,
            quantity: offeredCard.quantity,
          },
          update: {
            quantity: { increment: offeredCard.quantity },
          },
        })

        await LoggingService.logQuantityChange({
          userId: offer.offerUserId,
          holdingId: offeredCard.holdingId,
          cardName: offeredHolding.card.name,
          cardSet: offeredHolding.card.set,
          finish: offeredHolding.card.finish,
          delta: -offeredCard.quantity,
          reason: `traded to ${session.user.name ?? session.user.email} (offer accepted)`,
          actorId: userId,
        })
      }

      // 4. Mark offer as accepted
      await tx.tradeOffer.update({
        where: { id: offerId },
        data: {
          status: "accepted",
          completedAt: new Date(),
          declineMessage: message ?? null,
        },
      })

      // 5. Auto-decline other pending offers on this holding
      await tx.tradeOffer.updateMany({
        where: {
          holdingId: offer.holdingId,
          status: "pending",
          id: { not: offerId },
        },
        data: {
          status: "declined",
          declineMessage: "Another offer was accepted",
        },
      })
    })

    // Re-fetch the updated offer
    const updated = await TradeOfferRepository.findById(offerId)
    revalidatePath("/admin/trade-binder")
    revalidatePath("/admin/collection")
    revalidatePath("/admin/ledger")
    return { success: true, data: toTradeOfferDTO(updated!) }
  } catch (error) {
    console.error("Accept Offer Error:", error)
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Decline a trade offer. Must own the listing.
 */
export async function declineOffer(
  offerId: string,
  message?: string
): Promise<ActionResult<TradeOfferDTO>> {
  const session = await requireUser()
  const userId = session.user.id

  try {
    const offer = await TradeOfferRepository.findById(offerId)
    if (!offer) {
      return { success: false, error: "Offer not found" }
    }
    if (offer.holding.userId !== userId) {
      return { success: false, error: "You can only decline offers on your own listings" }
    }
    if (offer.status !== "pending") {
      return { success: false, error: `Cannot decline an offer that is ${offer.status}` }
    }

    const row = await TradeOfferRepository.updateStatus(offerId, "declined", {
      declineMessage: message ?? null,
    })

    revalidatePath("/admin/trade-binder")
    return { success: true, data: toTradeOfferDTO(row) }
  } catch (error) {
    console.error("Decline Offer Error:", error)
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Withdraw a trade offer. Must be the offerer.
 */
export async function withdrawOffer(offerId: string): Promise<ActionResult<void>> {
  const session = await requireUser()
  const userId = session.user.id

  try {
    const offer = await TradeOfferRepository.findById(offerId)
    if (!offer) {
      return { success: false, error: "Offer not found" }
    }
    if (offer.offerUserId !== userId) {
      return { success: false, error: "You can only withdraw your own offers" }
    }
    if (offer.status !== "pending") {
      return { success: false, error: `Cannot withdraw an offer that is ${offer.status}` }
    }

    await TradeOfferRepository.updateStatus(offerId, "withdrawn")
    revalidatePath("/admin/trade-binder")
    return { success: true, data: undefined }
  } catch (error) {
    console.error("Withdraw Offer Error:", error)
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Void a previously-accepted offer. Either party can void.
 * Reverses all quantity changes in a transaction.
 */
export async function voidOffer(offerId: string): Promise<ActionResult<TradeOfferDTO>> {
  const session = await requireUser()
  const userId = session.user.id

  try {
    const offer = await TradeOfferRepository.findById(offerId)
    if (!offer) {
      return { success: false, error: "Offer not found" }
    }
    if (offer.status !== "accepted") {
      return { success: false, error: "Only accepted offers can be voided" }
    }
    // Either party can void
    if (offer.holding.userId !== userId && offer.offerUserId !== userId) {
      return { success: false, error: "Only the listing owner or offerer can void this offer" }
    }

    await prisma.$transaction(async (tx) => {
      // Reverse the listed card transfer: increment owner, decrement offerer
      const listedHolding = await tx.holding.update({
        where: { id: offer.holdingId },
        data: { quantity: { increment: 1 } },
        include: { card: true },
      })

      // Decrement from offerer (they received the card during accept)
      const offererHolding = await tx.holding.findFirst({
        where: {
          userId: offer.offerUserId,
          cardId: listedHolding.cardId,
          condition: listedHolding.condition,
        },
      })
      if (offererHolding) {
        await tx.holding.update({
          where: { id: offererHolding.id },
          data: { quantity: { decrement: 1 } },
        })
      }

      await LoggingService.logQuantityChange({
        userId: offer.holding.userId,
        holdingId: offer.holdingId,
        cardName: listedHolding.card.name,
        cardSet: listedHolding.card.set,
        finish: listedHolding.card.finish,
        delta: 1,
        reason: `trade voided (offer ${offerId})`,
        actorId: userId,
      })

      // Reverse each offered card: increment offerer, decrement owner
      for (const offeredCard of offer.offeredCards) {
        const card = await tx.holding.update({
          where: { id: offeredCard.holdingId },
          data: { quantity: { increment: offeredCard.quantity } },
          include: { card: true },
        })

        // Find and decrement the card from the listing owner
        const ownerHolding = await tx.holding.findFirst({
          where: {
            userId: offer.holding.userId,
            cardId: card.cardId,
            condition: card.condition,
          },
        })
        if (ownerHolding) {
          await tx.holding.update({
            where: { id: ownerHolding.id },
            data: { quantity: { decrement: offeredCard.quantity } },
          })
        }

        await LoggingService.logQuantityChange({
          userId: offer.offerUserId,
          holdingId: offeredCard.holdingId,
          cardName: card.card.name,
          cardSet: card.card.set,
          finish: card.card.finish,
          delta: offeredCard.quantity,
          reason: `trade voided (offer ${offerId})`,
          actorId: userId,
        })
      }

      // Mark as voided
      await tx.tradeOffer.update({
        where: { id: offerId },
        data: {
          status: "voided",
          voidedAt: new Date(),
        },
      })
    })

    const updated = await TradeOfferRepository.findById(offerId)
    revalidatePath("/admin/trade-binder")
    revalidatePath("/admin/collection")
    revalidatePath("/admin/ledger")
    return { success: true, data: toTradeOfferDTO(updated!) }
  } catch (error) {
    console.error("Void Offer Error:", error)
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Get all offers on a specific listing.
 * Anyone can view; the DTO mapper scrubs anything sensitive.
 */
export async function getOffersForListing(
  holdingId: string
): Promise<ActionResult<TradeOfferDTO[]>> {
  await requireUser()
  try {
    const rows = await TradeOfferRepository.findByHoldingId(holdingId)
    return { success: true, data: rows.map(toTradeOfferDTO) }
  } catch (error) {
    console.error("Get Offers For Listing Error:", error)
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Get all outgoing offers made by the current user.
 */
export async function getMyOffers(): Promise<ActionResult<TradeOfferDTO[]>> {
  const session = await requireUser()
  try {
    const rows = await TradeOfferRepository.findByOfferUser(session.user.id)
    return { success: true, data: rows.map(toTradeOfferDTO) }
  } catch (error) {
    console.error("Get My Offers Error:", error)
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Get all offers on holdings owned by the current user.
 */
export async function getOffersOnMyListings(): Promise<ActionResult<TradeOfferDTO[]>> {
  const session = await requireUser()
  try {
    const rows = await TradeOfferRepository.findOffersOnUserListings(session.user.id)
    return { success: true, data: rows.map(toTradeOfferDTO) }
  } catch (error) {
    console.error("Get Offers on My Listings Error:", error)
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Get count of pending offers on the current user's listings (for sidebar badge).
 */
export async function getPendingOfferCount(): Promise<ActionResult<number>> {
  const session = await requireUser()
  try {
    const count = await TradeOfferRepository.countPendingOnUserListings(session.user.id)
    return { success: true, data: count }
  } catch (error) {
    console.error("Get Pending Offer Count Error:", error)
    return { success: false, error: (error as Error).message }
  }
}
