import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/auth-guard"
import { LoggingService } from "@/services/logging.service"
import type { LedgerEntryDTO } from "@/lib/dtos"

export async function GET(request: NextRequest) {
  try {
    await requireUser()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const startDateParam = searchParams.get("startDate")
  const endDateParam = searchParams.get("endDate")
  const type = searchParams.get("type") as "quantity" | "price" | null

  const end = endDateParam ? new Date(endDateParam) : new Date()
  const start = startDateParam
    ? new Date(startDateParam)
    : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 })
  }

  try {
    let entries = await LoggingService.listAllInRange(start, end)

    if (type) {
      entries = entries.filter((e) => e.type === type)
    }

    const csv = generateCSV(entries)
    const filename = `ledger-export-${start.toISOString().slice(0, 10)}-to-${end.toISOString().slice(0, 10)}.csv`

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Ledger export error:", error)
    return NextResponse.json({ error: "Export failed" }, { status: 500 })
  }
}

function generateCSV(entries: LedgerEntryDTO[]): string {
  const headers = [
    "Date",
    "Card",
    "Type",
    "Delta",
    "Old Price (USD)",
    "New Price (USD)",
    "Set",
    "Condition",
    "Reason/Source",
  ]

  const rows = entries.map((e) => [
    new Date(e.time).toISOString(),
    `"${e.cardName.replace(/"/g, '""')}"`,
    e.type,
    e.type === "quantity" ? String(e.delta ?? 0) : "",
    e.type === "price" && e.oldPrice != null ? (e.oldPrice / 100).toFixed(2) : "",
    e.type === "price" && e.newPrice != null ? (e.newPrice / 100).toFixed(2) : "",
    e.cardSet ?? "",
    e.condition ?? "",
    e.type === "quantity" ? (e.reason ?? "") : (e.source ?? ""),
  ])

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
}
