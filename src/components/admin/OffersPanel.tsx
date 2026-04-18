"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Check, X, Undo2, Loader2, ImageIcon, Ban, MessageSquare, ChevronDown } from "lucide-react"
import type { TradeOfferDTO } from "@/lib/dtos"
import {
  getMyOffers,
  getOffersOnMyListings,
  acceptOffer,
  declineOffer,
  withdrawOffer,
  voidOffer,
} from "@/app/actions/trade-offer"
import { toast } from "sonner"

type Tab = "incoming" | "outgoing"

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  accepted: {
    label: "Accepted",
    className: "bg-green-500/10 text-green-600 border-green-500/20",
  },
  declined: { label: "Declined", className: "bg-red-500/10 text-red-600 border-red-500/20" },
  withdrawn: { label: "Withdrawn", className: "bg-muted text-muted-foreground border-border" },
  voided: { label: "Voided", className: "bg-muted text-muted-foreground border-border" },
}

export function OffersPanel() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("incoming")
  const [incoming, setIncoming] = useState<TradeOfferDTO[]>([])
  const [outgoing, setOutgoing] = useState<TradeOfferDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [messageInputId, setMessageInputId] = useState<string | null>(null)
  const [messageText, setMessageText] = useState("")

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const [inResult, outResult] = await Promise.all([getOffersOnMyListings(), getMyOffers()])
      if (inResult.success) setIncoming(inResult.data)
      if (outResult.success) setOutgoing(outResult.data)
      setLoading(false)
    }
    loadData()
  }, [])

  async function handleAccept(offerId: string) {
    setActionLoading(offerId)
    const msg = messageInputId === `accept-${offerId}` ? messageText.trim() : undefined
    const result = await acceptOffer(offerId, msg || undefined)
    if (result.success) {
      toast.success("Offer accepted!")
      setIncoming((prev) => prev.map((o) => (o.id === offerId ? { ...o, status: "accepted" } : o)))
      router.refresh()
    } else {
      toast.error(result.error)
    }
    setActionLoading(null)
    setMessageInputId(null)
    setMessageText("")
  }

  async function handleDecline(offerId: string) {
    setActionLoading(offerId)
    const msg = messageInputId === `decline-${offerId}` ? messageText.trim() : undefined
    const result = await declineOffer(offerId, msg || undefined)
    if (result.success) {
      toast.success("Offer declined")
      setIncoming((prev) => prev.map((o) => (o.id === offerId ? { ...o, status: "declined" } : o)))
      router.refresh()
    } else {
      toast.error(result.error)
    }
    setActionLoading(null)
    setMessageInputId(null)
    setMessageText("")
  }

  async function handleWithdraw(offerId: string) {
    setActionLoading(offerId)
    const result = await withdrawOffer(offerId)
    if (result.success) {
      toast.success("Offer withdrawn")
      setOutgoing((prev) => prev.map((o) => (o.id === offerId ? { ...o, status: "withdrawn" } : o)))
      router.refresh()
    } else {
      toast.error(result.error)
    }
    setActionLoading(null)
  }

  async function handleVoid(offerId: string) {
    if (!confirm("Void this accepted offer? This will reverse the trade.")) return
    setActionLoading(offerId)
    const result = await voidOffer(offerId)
    if (result.success) {
      toast.success("Offer voided, trade reversed")
      setOutgoing((prev) => prev.map((o) => (o.id === offerId ? { ...o, status: "voided" } : o)))
      router.refresh()
    } else {
      toast.error(result.error)
    }
    setActionLoading(null)
  }

  function toggleMessageInput(key: string) {
    if (messageInputId === key) {
      setMessageInputId(null)
      setMessageText("")
    } else {
      setMessageInputId(key)
      setMessageText("")
    }
  }

  const incomingPending = incoming.filter((o) => o.status === "pending")
  const incomingResolved = incoming.filter((o) => o.status !== "pending")

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setTab("incoming")}
          className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors min-h-[44px] ${
            tab === "incoming"
              ? "bg-primary/5 text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Offers on My Listings
          {incomingPending.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary font-bold">
              {incomingPending.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("outgoing")}
          className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors min-h-[44px] ${
            tab === "outgoing"
              ? "bg-primary/5 text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          My Offers
          {outgoing.filter((o) => o.status === "pending").length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary font-bold">
              {outgoing.filter((o) => o.status === "pending").length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="p-3 max-h-[500px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : tab === "incoming" ? (
          incoming.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              No offers on your listings yet.
            </p>
          ) : (
            <div className="space-y-2">
              {[...incomingPending, ...incomingResolved].map((offer) => (
                <div
                  key={offer.id}
                  className="p-3 rounded-md bg-muted/30 border border-border space-y-2"
                >
                  {/* Card and offeror */}
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {offer.card.name}
                        <span className="text-muted-foreground font-normal ml-1">
                          ({offer.card.set})
                        </span>
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        From: {offer.offerUser.displayName || offer.offerUser.email}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${
                        STATUS_BADGE[offer.status]?.className ?? ""
                      }`}
                    >
                      {STATUS_BADGE[offer.status]?.label ?? offer.status}
                    </span>
                  </div>

                  {/* Offer details */}
                  <div className="text-[11px] text-muted-foreground space-y-0.5">
                    {offer.cashAmount > 0 && (
                      <p>
                        Cash:{" "}
                        <span className="font-medium text-foreground">
                          ${(offer.cashAmount / 100).toFixed(2)}
                        </span>
                      </p>
                    )}
                    {offer.offeredCards.length > 0 && (
                      <div>
                        <p className="mb-1">Cards offered:</p>
                        {offer.offeredCards.map((c) => (
                          <div key={c.id} className="flex items-center gap-1.5 ml-2 mb-0.5">
                            <div className="w-4 h-6 relative bg-muted rounded border border-border shrink-0 overflow-hidden">
                              {c.card.imageSmall ? (
                                <Image
                                  src={c.card.imageSmall}
                                  alt={c.card.name}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="w-2 h-2 text-muted-foreground/40" />
                                </div>
                              )}
                            </div>
                            <span className="truncate">
                              {c.card.name} x{c.quantity}
                              {c.marketValue != null && (
                                <span className="font-mono ml-1">
                                  (${(c.marketValue / 100).toFixed(2)})
                                </span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {offer.message && <p className="italic">&ldquo;{offer.message}&rdquo;</p>}
                  </div>

                  {/* Accept/Decline actions */}
                  {offer.status === "pending" && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        onClick={() => toggleMessageInput(`accept-${offer.id}`)}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-md text-[10px] font-medium bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors min-h-[32px]"
                      >
                        <Check className="w-3 h-3" />
                        Accept
                        <ChevronDown className="w-2.5 h-2.5" />
                      </button>
                      <button
                        onClick={() => toggleMessageInput(`decline-${offer.id}`)}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-md text-[10px] font-medium bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors min-h-[32px]"
                      >
                        <X className="w-3 h-3" />
                        Decline
                        <ChevronDown className="w-2.5 h-2.5" />
                      </button>

                      {/* Quick accept/decline without message */}
                      {messageInputId !== `accept-${offer.id}` &&
                        messageInputId !== `decline-${offer.id}` && (
                          <>
                            <button
                              onClick={() => handleAccept(offer.id)}
                              disabled={actionLoading === offer.id}
                              className="ml-auto p-1.5 rounded-md bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors disabled:opacity-50 min-w-[32px] min-h-[32px] flex items-center justify-center"
                              title="Accept now"
                            >
                              {actionLoading === offer.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDecline(offer.id)}
                              disabled={actionLoading === offer.id}
                              className="p-1.5 rounded-md bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors disabled:opacity-50 min-w-[32px] min-h-[32px] flex items-center justify-center"
                              title="Decline now"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                    </div>
                  )}

                  {/* Message textarea for accept/decline */}
                  {(messageInputId === `accept-${offer.id}` ||
                    messageInputId === `decline-${offer.id}`) && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">
                          {messageInputId.startsWith("accept") ? "Accept" : "Decline"} message
                          (optional)
                        </span>
                      </div>
                      <textarea
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="Add a message..."
                        maxLength={512}
                        rows={2}
                        className="w-full px-2 py-1.5 bg-muted/40 border border-border rounded text-[11px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 resize-none"
                      />
                      <div className="flex gap-1.5">
                        <button
                          onClick={() =>
                            messageInputId.startsWith("accept")
                              ? handleAccept(offer.id)
                              : handleDecline(offer.id)
                          }
                          disabled={actionLoading === offer.id}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-medium transition-colors disabled:opacity-50 min-h-[32px] ${
                            messageInputId.startsWith("accept")
                              ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                              : "bg-red-500/10 text-red-600 hover:bg-red-500/20"
                          }`}
                        >
                          {actionLoading === offer.id && (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          )}
                          {messageInputId.startsWith("accept") ? "Accept" : "Decline"}
                        </button>
                        <button
                          onClick={() => {
                            setMessageInputId(null)
                            setMessageText("")
                          }}
                          className="px-2 py-1.5 rounded text-[10px] font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors min-h-[32px]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {offer.declineMessage && offer.status !== "pending" && (
                    <p className="text-[10px] text-muted-foreground italic pt-1">
                      Message: &ldquo;{offer.declineMessage}&rdquo;
                    </p>
                  )}
                </div>
              ))}
            </div>
          )
        ) : outgoing.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            You haven&apos;t made any offers yet.
          </p>
        ) : (
          <div className="space-y-2">
            {outgoing.map((offer) => (
              <div
                key={offer.id}
                className="p-3 rounded-md bg-muted/30 border border-border space-y-2"
              >
                <div className="flex items-start gap-2">
                  <div className="w-8 h-11 relative bg-muted rounded border border-border shrink-0 overflow-hidden">
                    {offer.card.imageSmall ? (
                      <Image
                        src={offer.card.imageSmall}
                        alt={offer.card.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-3 h-3 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {offer.card.name}
                      <span className="text-muted-foreground font-normal ml-1">
                        ({offer.card.set})
                      </span>
                    </p>
                    <div className="text-[11px] text-muted-foreground">
                      {offer.cashAmount > 0 && (
                        <span>${(offer.cashAmount / 100).toFixed(2)} cash</span>
                      )}
                      {offer.cashAmount > 0 && offer.offeredCards.length > 0 && " + "}
                      {offer.offeredCards.length > 0 && (
                        <span>
                          {offer.offeredCards.length} card
                          {offer.offeredCards.length > 1 ? "s" : ""}
                          {offer.offeredCardsValue > 0 && (
                            <> (${(offer.offeredCardsValue / 100).toFixed(2)})</>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${
                      STATUS_BADGE[offer.status]?.className ?? ""
                    }`}
                  >
                    {STATUS_BADGE[offer.status]?.label ?? offer.status}
                  </span>
                </div>

                {/* Actions by status */}
                <div className="flex items-center gap-1.5">
                  {offer.status === "pending" && (
                    <button
                      onClick={() => handleWithdraw(offer.id)}
                      disabled={actionLoading === offer.id}
                      className="flex items-center gap-1 px-2 py-1.5 rounded text-[10px] font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors disabled:opacity-50 min-h-[32px]"
                    >
                      {actionLoading === offer.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Undo2 className="w-3 h-3" />
                      )}
                      Withdraw
                    </button>
                  )}
                  {offer.status === "accepted" && (
                    <button
                      onClick={() => handleVoid(offer.id)}
                      disabled={actionLoading === offer.id}
                      className="flex items-center gap-1 px-2 py-1.5 rounded text-[10px] font-medium bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors disabled:opacity-50 min-h-[32px]"
                    >
                      {actionLoading === offer.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Ban className="w-3 h-3" />
                      )}
                      Void
                    </button>
                  )}
                </div>

                {offer.declineMessage && (
                  <p className="text-[10px] text-muted-foreground italic">
                    Response: &ldquo;{offer.declineMessage}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
