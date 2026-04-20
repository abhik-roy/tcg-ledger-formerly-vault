import { cn } from "@/lib/utils"
import type { ReactNode, CSSProperties } from "react"

export interface ChipProps {
  children: ReactNode
  tone?: string
  mono?: boolean
  sharp?: boolean
  solid?: boolean
  className?: string
  style?: CSSProperties
}

export function Chip({ children, tone, mono, sharp, solid, className, style }: ChipProps) {
  const dynamic: CSSProperties = tone
    ? {
        color: tone,
        borderColor: `color-mix(in srgb, ${tone} 32%, transparent)`,
      }
    : {}
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[5px] px-[9px] py-[3px] text-[10.5px] font-medium leading-[1.4] whitespace-nowrap border",
        "border-[var(--rule-strong)] text-[var(--ink-2)]",
        mono && "font-mono uppercase tracking-[0.06em] text-[10px]",
        sharp ? "rounded-[var(--radius-sharp)]" : "rounded-full",
        solid && "bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]",
        className
      )}
      style={{ ...dynamic, ...style }}
    >
      {children}
    </span>
  )
}
