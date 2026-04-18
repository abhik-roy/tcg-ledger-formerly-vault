"use client"

import Image from "next/image"
import type { CardDTO } from "@/lib/dtos"
import { X, ImageIcon, Mail } from "lucide-react"

interface CardDetailDialogProps {
  card: CardDTO | null
  open: boolean
  onClose: () => void
  ownerInfo?: { name: string; email: string } | null
}

export function CardDetailDialog({ card, open, onClose, ownerInfo }: CardDetailDialogProps) {
  if (!open || !card) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50"
      onClick={onClose}
    >
      {/* Mobile: full-width bottom sheet. Desktop: centered dialog */}
      <div
        className="bg-card border border-border shadow-2xl w-full md:max-w-md md:mx-4 md:rounded-xl rounded-t-2xl md:rounded-2xl overflow-hidden max-h-[90vh] md:max-h-[85vh] flex flex-col animate-in slide-in-from-bottom md:slide-in-from-bottom-0 md:fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3 border-b border-border flex items-center justify-between shrink-0">
          {/* Mobile drag indicator */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-muted-foreground/30 md:hidden" />
          <h2 className="text-sm font-semibold text-foreground truncate pr-2 mt-1 md:mt-0">
            {card.name}
          </h2>
          <button
            onClick={onClose}
            className="w-11 h-11 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Image */}
          <div className="aspect-[3/4] relative bg-muted max-h-[400px]">
            {card.imageNormal || card.imageSmall ? (
              <Image
                src={card.imageNormal || card.imageSmall || ""}
                alt={card.name}
                fill
                className="object-contain p-2"
                unoptimized
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <ImageIcon className="w-12 h-12 text-muted-foreground/20" />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-caption text-muted-foreground uppercase font-semibold block">
                  Set
                </span>
                <span className="text-foreground">{card.setName}</span>
              </div>
              <div>
                <span className="text-caption text-muted-foreground uppercase font-semibold block">
                  Number
                </span>
                <span className="text-foreground">#{card.collectorNumber}</span>
              </div>
              <div>
                <span className="text-caption text-muted-foreground uppercase font-semibold block">
                  Rarity
                </span>
                <span className="text-foreground capitalize">{card.rarity}</span>
              </div>
              <div>
                <span className="text-caption text-muted-foreground uppercase font-semibold block">
                  Finish
                </span>
                <span className="text-foreground capitalize">{card.finish}</span>
              </div>
              <div>
                <span className="text-caption text-muted-foreground uppercase font-semibold block">
                  Game
                </span>
                <span className="text-foreground">{card.game}</span>
              </div>
              <div>
                <span className="text-caption text-muted-foreground uppercase font-semibold block">
                  Market Price
                </span>
                <span className="text-foreground font-mono tabular-nums">
                  {card.marketPrice != null ? `$${(card.marketPrice / 100).toFixed(2)}` : "\u2014"}
                </span>
              </div>
            </div>

            {ownerInfo && (
              <div className="pt-3 border-t border-border space-y-2">
                <div>
                  <span className="text-caption text-muted-foreground uppercase font-semibold block">
                    Owner
                  </span>
                  <span className="text-sm text-foreground">
                    {ownerInfo.name || ownerInfo.email}
                  </span>
                </div>
                <a
                  href={`mailto:${ownerInfo.email}?subject=About your ${card.name}`}
                  className="inline-flex items-center gap-2 h-11 px-4 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors min-h-[44px]"
                >
                  <Mail className="w-4 h-4" />
                  Contact owner
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
