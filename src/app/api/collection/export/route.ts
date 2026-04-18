import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { HoldingService } from "@/services/holding.service"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const holdings = await HoldingService.listForUser(session.user.id)

    // Build CSV
    const headers = [
      "Card Name",
      "Set",
      "Set Name",
      "Collector Number",
      "Finish",
      "Game",
      "Rarity",
      "Condition",
      "Quantity",
      "Market Price (USD)",
      "Listed For Trade",
      "Notes",
    ]

    const rows = holdings.map((h) => [
      `"${h.card.name.replace(/"/g, '""')}"`,
      h.card.set,
      `"${h.card.setName.replace(/"/g, '""')}"`,
      h.card.collectorNumber,
      h.card.finish,
      h.card.game,
      h.card.rarity,
      h.condition,
      String(h.quantity),
      h.card.marketPrice != null ? (h.card.marketPrice / 100).toFixed(2) : "",
      h.listedForTrade ? "Yes" : "No",
      h.notes ? `"${h.notes.replace(/"/g, '""')}"` : "",
    ])

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")

    const date = new Date().toISOString().split("T")[0]
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="tcg_collection_export_${date}.csv"`,
      },
    })
  } catch (error) {
    console.error("Export error:", error)
    return NextResponse.json({ error: "Failed to generate export" }, { status: 500 })
  }
}
