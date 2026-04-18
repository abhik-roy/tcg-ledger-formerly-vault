interface OrderTotalsProps {
  cartTotal: number
  shippingCost: number
  taxEstimate: number
  finalTotal: number
  isPickup: boolean
}

export default function OrderTotals({
  cartTotal,
  shippingCost,
  taxEstimate,
  finalTotal,
  isPickup,
}: OrderTotalsProps) {
  return (
    <>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span className="font-semibold text-foreground">${(cartTotal / 100).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Shipping</span>
          <span className={`font-semibold ${isPickup ? "text-success" : "text-foreground"}`}>
            {isPickup ? "FREE" : `$${(shippingCost / 100).toFixed(2)}`}
          </span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Estimated Tax</span>
          <span className="font-semibold text-foreground">${(taxEstimate / 100).toFixed(2)}</span>
        </div>
      </div>

      <div className="flex justify-between items-baseline pt-5 mt-5 border-t border-border">
        <span className="text-sm font-semibold text-foreground">Total</span>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            USD
          </span>
          <span className="text-2xl font-black text-foreground tracking-tight">
            ${(finalTotal / 100).toFixed(2)}
          </span>
        </div>
      </div>
    </>
  )
}
