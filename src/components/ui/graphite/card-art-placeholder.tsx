"use client"

import type { CSSProperties } from "react"

export type CardArtSize = "xs" | "sm" | "md" | "lg" | "xl"

const DIMS: Record<CardArtSize, { w: number; h: number }> = {
  xs: { w: 36, h: 50 },
  sm: { w: 48, h: 67 },
  md: { w: 120, h: 168 },
  lg: { w: 200, h: 280 },
  xl: { w: 280, h: 392 },
}

const GAME_COLORS: Record<string, string> = {
  magic: "#3b82f6",
  pokemon: "#ef4444",
  yugioh: "#a855f7",
  lorcana: "#6366f1",
}

interface Props {
  name: string
  set: string
  collectorNumber: string
  game: string
  size?: CardArtSize
  style?: CSSProperties
}

export function CardArtPlaceholder({
  name,
  set,
  collectorNumber,
  game,
  size = "md",
  style,
}: Props) {
  const { w, h } = DIMS[size]
  const color = GAME_COLORS[game.toLowerCase()] ?? "#888"
  return (
    <div className="sleeve shrink-0" style={{ width: w + 8, height: h + 8, ...style }}>
      <div
        className="card-art-placeholder w-full h-full relative flex flex-col"
        style={{ ["--art-color" as string]: color }}
      >
        <div className="absolute inset-[5%] flex flex-col rounded-[3px] border border-white/10">
          <div
            className="px-[6%] py-[4%] border-b text-white/90 font-semibold whitespace-nowrap overflow-hidden text-ellipsis leading-[1.1]"
            style={{
              fontSize: Math.max(7, w * 0.055),
              borderBottomColor: `color-mix(in srgb, ${color} 40%, rgba(255,255,255,0.12))`,
              background: `linear-gradient(180deg, color-mix(in srgb, ${color} 35%, transparent), transparent)`,
            }}
          >
            {name}
          </div>
          <div className="flex-1 relative overflow-hidden grid place-items-center">
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(circle at 28% 30%, color-mix(in srgb, ${color} 60%, transparent) 0, transparent 55%), radial-gradient(circle at 72% 75%, color-mix(in srgb, ${color} 40%, transparent) 0, transparent 50%)`,
              }}
            />
            <svg
              width={w * 0.42}
              height={w * 0.42}
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,0.85)"
              strokeWidth={1.1}
              opacity={0.9}
              className="relative"
            >
              {game === "magic" && <path d="M12 2 L4 8 L4 16 L12 22 L20 16 L20 8 Z" />}
              {game === "pokemon" && (
                <>
                  <circle cx={12} cy={12} r={9} />
                  <path d="M3 12h18" />
                  <circle cx={12} cy={12} r={3} fill="rgba(255,255,255,0.9)" />
                </>
              )}
              {game === "yugioh" && (
                <>
                  <polygon points="12,2 22,12 12,22 2,12" />
                  <circle cx={12} cy={12} r={4} />
                </>
              )}
              {game === "lorcana" && (
                <>
                  <path d="M12 3 C 7 3 3 7 3 12 C 3 17 7 21 12 21 C 17 21 21 17 21 12" />
                  <path d="M8 12 C 10 10 14 10 16 12" />
                </>
              )}
            </svg>
          </div>
          <div
            className="px-[6%] py-[3%] pb-[4%] font-mono font-medium uppercase whitespace-nowrap"
            style={{
              fontSize: Math.max(6, w * 0.05),
              color: "rgba(255,255,255,0.65)",
              letterSpacing: "0.08em",
              borderTop: `1px solid color-mix(in srgb, ${color} 30%, rgba(255,255,255,0.08))`,
            }}
          >
            {set} · {collectorNumber}
          </div>
        </div>
      </div>
    </div>
  )
}
