import { cn } from "@/lib/utils"
import React from "react"

export function SectionLabel({
  children,
  className,
  style,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div className={cn("section-label", className)} style={style}>
      {children}
    </div>
  )
}
