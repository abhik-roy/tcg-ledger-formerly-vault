"use client"

import { CardArtPlaceholder } from "@/components/ui/graphite"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

interface Props {
  onCreate: () => void
}

export function EmptyShelf({ onCreate }: Props) {
  return (
    <div
      className="px-8 py-[72px] text-center"
      style={{
        border: "1px dashed var(--rule-strong)",
        borderRadius: "var(--radius-md)",
        background: "var(--surface)",
      }}
    >
      <div className="flex justify-center mb-5">
        <div className="opacity-30" style={{ transform: "rotate(-8deg)", marginRight: -16 }}>
          <CardArtPlaceholder name="—" set="—" collectorNumber="—" game="magic" size="sm" />
        </div>
        <div className="opacity-60" style={{ zIndex: 1 }}>
          <CardArtPlaceholder name="—" set="—" collectorNumber="—" game="pokemon" size="sm" />
        </div>
        <div className="opacity-30" style={{ transform: "rotate(8deg)", marginLeft: -16 }}>
          <CardArtPlaceholder name="—" set="—" collectorNumber="—" game="yugioh" size="sm" />
        </div>
      </div>
      <div className="serif" style={{ fontSize: 32, letterSpacing: "-0.02em" }}>
        Nothing on the <span className="serif-italic">binder today</span>
      </div>
      <p
        className="mx-auto mt-2.5 mb-5 max-w-[400px]"
        style={{ fontSize: 13, color: "var(--ink-3)" }}
      >
        Try clearing filters, or be the first to list. A quiet binder is an opportunity.
      </p>
      <Button variant="default" onClick={onCreate}>
        <Plus className="w-4 h-4 mr-2" />
        List a card for trade
      </Button>
    </div>
  )
}
