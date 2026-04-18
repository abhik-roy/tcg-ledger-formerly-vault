"use client"

import { useState } from "react"
import { X, User, CreditCard, Banknote, Loader2, CheckCircle2, ChevronLeft } from "lucide-react"
import { createPOSOrderAction } from "@/app/actions/pos"
import { type CartItem } from "./POSClient"

interface POSCheckoutModalProps {
  cartItems: CartItem[]
  subtotal: number
  onClose: () => void
  onSuccess: () => void
}

type Step = "payment" | "confirm" | "receipt"

function formatPrice(cents: number) {
  return "$" + (cents / 100).toFixed(2)
}

function parseDollars(val: string): number {
  const n = parseFloat(val)
  return isNaN(n) ? 0 : Math.round(n * 100)
}

export function POSCheckoutModal({
  cartItems,
  subtotal,
  onClose,
  onSuccess,
}: POSCheckoutModalProps) {
  const [step, setStep] = useState<Step>("payment")
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD">("CARD")
  const [cashInput, setCashInput] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ orderId: string; change?: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const totalItems = cartItems.reduce((s, c) => s + c.cartQty, 0)
  const amountPaidCents = parseDollars(cashInput)
  const changeDue =
    paymentMethod === "CASH" && amountPaidCents > subtotal ? amountPaidCents - subtotal : null

  async function handleComplete() {
    setLoading(true)
    setError(null)
    try {
      const res = await createPOSOrderAction({
        items: cartItems.map((c) => ({
          inventoryId: c.id,
          name: c.name,
          setName: c.setName,
          condition: c.condition,
          finish: c.finish,
          price: c.price,
          quantity: c.cartQty,
        })),
        customerEmail: customerEmail.trim() || undefined,
        paymentMethod,
        amountPaid: paymentMethod === "CASH" ? amountPaidCents : undefined,
      })

      if (res.success && res.orderId) {
        setResult({ orderId: res.orderId, change: res.change })
        setStep("receipt")
      } else {
        setError(res.error || "Failed to complete sale")
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Step: payment */}
        {step === "payment" && (
          <>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h2 className="font-bold text-base text-foreground">Complete Sale</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {totalItems} item{totalItems !== 1 ? "s" : ""} &bull; {formatPrice(subtotal)}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Customer email */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Customer (optional)
                </label>
                <div className="flex items-center gap-2 bg-muted/40 border border-border rounded-md px-3 h-9 focus-within:border-primary/50 focus-within:bg-card transition-colors">
                  <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="customer@email.com"
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                </div>
              </div>

              {/* Payment method */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Payment Method
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPaymentMethod("CARD")}
                    className={[
                      "flex-1 h-9 rounded-md border text-sm font-medium flex items-center justify-center gap-1.5 transition-colors",
                      paymentMethod === "CARD"
                        ? "bg-primary/10 border-primary/25 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted/50",
                    ].join(" ")}
                  >
                    <CreditCard className="w-4 h-4" />
                    Card
                  </button>
                  <button
                    onClick={() => setPaymentMethod("CASH")}
                    className={[
                      "flex-1 h-9 rounded-md border text-sm font-medium flex items-center justify-center gap-1.5 transition-colors",
                      paymentMethod === "CASH"
                        ? "bg-primary/10 border-primary/25 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted/50",
                    ].join(" ")}
                  >
                    <Banknote className="w-4 h-4" />
                    Cash
                  </button>
                </div>
              </div>

              {/* Cash amount */}
              {paymentMethod === "CASH" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Amount Received ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={cashInput}
                    onChange={(e) => setCashInput(e.target.value)}
                    placeholder={`${(subtotal / 100).toFixed(2)}`}
                    className="w-full bg-muted/40 border border-border rounded-md px-3 h-9 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:bg-card transition-colors"
                  />
                  {changeDue !== null && (
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Change due:{" "}
                      <span className="font-semibold text-foreground">
                        {formatPrice(changeDue)}
                      </span>
                    </p>
                  )}
                  {paymentMethod === "CASH" && cashInput && amountPaidCents < subtotal && (
                    <p className="text-xs text-destructive mt-1.5">
                      Amount is less than total ({formatPrice(subtotal)})
                    </p>
                  )}
                </div>
              )}

              {/* Order summary */}
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2">Order Summary</div>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex justify-between text-xs text-foreground">
                      <span className="truncate mr-2">
                        {item.name} <span className="text-muted-foreground">x{item.cartQty}</span>
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {formatPrice(item.price * item.cartQty)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-sm font-bold text-foreground border-t border-border pt-2 mt-2">
                  <span>Total</span>
                  <span className="tabular-nums">{formatPrice(subtotal)}</span>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-border flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 h-9 border border-border rounded-md text-sm text-foreground hover:bg-muted/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep("confirm")}
                disabled={
                  paymentMethod === "CASH" && cashInput !== "" && amountPaidCents < subtotal
                }
                className="flex-1 h-9 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Review &rarr;
              </button>
            </div>
          </>
        )}

        {/* Step: confirm */}
        {step === "confirm" && (
          <>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-bold text-base text-foreground">Confirm Sale</h2>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment</span>
                  <span className="font-medium text-foreground capitalize">
                    {paymentMethod === "CARD" ? "Card" : "Cash"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer</span>
                  <span className="font-medium text-foreground">
                    {customerEmail.trim() || "Walk-in"}
                  </span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 mt-1">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="font-bold text-foreground tabular-nums">
                    {formatPrice(subtotal)}
                  </span>
                </div>
                {paymentMethod === "CASH" && cashInput && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Received</span>
                      <span className="font-medium text-foreground tabular-nums">
                        {formatPrice(amountPaidCents)}
                      </span>
                    </div>
                    {changeDue !== null && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Change</span>
                        <span className="font-semibold text-foreground tabular-nums">
                          {formatPrice(changeDue)}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {error && (
                <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                  {error}
                </p>
              )}
            </div>

            <div className="px-5 py-4 border-t border-border flex gap-3">
              <button
                onClick={() => {
                  setError(null)
                  setStep("payment")
                }}
                disabled={loading}
                className="flex items-center gap-1.5 h-9 px-4 border border-border rounded-md text-sm text-foreground hover:bg-muted/50 transition-colors disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back
              </button>
              <button
                onClick={handleComplete}
                disabled={loading}
                className="flex-1 h-9 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Complete Sale"
                )}
              </button>
            </div>
          </>
        )}

        {/* Step: receipt */}
        {step === "receipt" && result && (
          <>
            <div className="px-5 py-8 text-center space-y-4">
              <div className="flex items-center justify-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-9 h-9 text-primary" />
                </div>
              </div>
              <div>
                <h2 className="font-bold text-xl text-foreground">Sale Complete!</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Order #{result.orderId.slice(-6).toUpperCase()}
                </p>
              </div>
              <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-2 text-sm text-left">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-bold text-foreground tabular-nums">
                    {formatPrice(subtotal)}
                  </span>
                </div>
                {result.change != null && result.change > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Change</span>
                    <span className="font-semibold text-foreground tabular-nums">
                      {formatPrice(result.change)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 pb-6">
              <button
                onClick={onSuccess}
                className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold text-sm transition-colors"
              >
                New Sale
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
