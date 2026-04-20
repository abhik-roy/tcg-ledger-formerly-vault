"use client"

import Image from "next/image"
import type { CardDTO } from "@/lib/dtos"
import { CardArtPlaceholder, type CardArtSize } from "./card-art-placeholder"

const DIMS: Record<CardArtSize, { w: number; h: number }> = {
  xs: { w: 36, h: 50 },
  sm: { w: 48, h: 67 },
  md: { w: 120, h: 168 },
  lg: { w: 200, h: 280 },
  xl: { w: 280, h: 392 },
}

interface Props {
  card: Pick<CardDTO, "name" | "set" | "collectorNumber" | "game" | "imageSmall" | "imageNormal">
  size?: CardArtSize
}

export function CardArt({ card, size = "md" }: Props) {
  const { w, h } = DIMS[size]
  const src =
    size === "xl" || size === "lg"
      ? (card.imageNormal ?? card.imageSmall)
      : (card.imageSmall ?? card.imageNormal)

  if (src) {
    return (
      <div className="sleeve shrink-0 overflow-hidden" style={{ width: w + 8, height: h + 8 }}>
        <div className="w-full h-full relative rounded-[6px] overflow-hidden bg-black">
          <Image
            src={src}
            alt={card.name}
            fill
            sizes={`${w}px`}
            className="object-cover"
            unoptimized
          />
        </div>
      </div>
    )
  }

  return (
    <CardArtPlaceholder
      name={card.name}
      set={card.set}
      collectorNumber={card.collectorNumber}
      game={card.game}
      size={size}
    />
  )
}
