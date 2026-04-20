export function formatUsdCents(cents: number): string {
  const sign = cents < 0 ? "-" : ""
  const n = Math.abs(cents) / 100
  return (
    sign + "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  )
}

export function formatAsk(
  askType: string | null,
  askValue: number | null,
  marketPriceCents: number | null
): string | null {
  if (askType == null) return null
  if (askType === "trade_only") return "Trade only"
  if (askType === "custom" && askValue != null) return formatUsdCents(askValue)
  if (askType === "percent" && askValue != null) {
    if (marketPriceCents == null) return `${askValue}% mkt`
    const cents = Math.round((marketPriceCents * askValue) / 100)
    return `${askValue}% mkt · ${formatUsdCents(cents)}`
  }
  return null
}
