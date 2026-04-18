"use client"

import { useState, useEffect, useRef } from "react"
import { useCart } from "@/context/cart-context"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  CreditCard,
  ChevronRight,
  Layers,
  Lock,
  Check,
  ArrowRight,
  Loader2,
  Store,
  Truck,
  Banknote,
  ShoppingBag,
} from "lucide-react"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import OrderSuccessView from "@/components/shop/OrderSuccessView"
import OrderItemList from "@/components/shop/OrderItemList"
import OrderTotals from "@/components/shop/OrderTotals"
import type { OrderConfirmationDTO } from "@/lib/types"
import { cn } from "@/lib/utils"
import { placeInStoreOrder } from "@/app/actions/checkout"
import { createStripeSession } from "@/app/actions/stripe"

export default function CheckoutClient({ taxRate }: { taxRate: number }) {
  const { items, cartTotal, clearCart, isHydrated, cartCount } = useCart()
  const { data: session, status } = useSession()
  const router = useRouter()

  const formRef = useRef<HTMLFormElement>(null)
  // DEV-111: Stable idempotency key generated once per checkout attempt.
  // Prevents duplicate orders if the server action is called twice (e.g., network retry).
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID())

  const [isProcessing, setIsProcessing] = useState(false)
  const [step, setStep] = useState(1)
  const [errorMsg, setErrorMsg] = useState("")
  const [confirmedOrder, setConfirmedOrder] = useState<OrderConfirmationDTO | null>(null)

  const [shippingMethod, setShippingMethod] = useState("pickup")
  const [paymentMethod, setPaymentMethod] = useState("pay_in_store")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [addressLine1, setAddressLine1] = useState("")
  const [city, setCity] = useState("")
  const [postalCode, setPostalCode] = useState("")

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)

  const isPickup = shippingMethod === "pickup"
  const shippingCost = isPickup ? 0 : shippingMethod === "express" ? 1499 : 499
  const taxEstimate = Math.round(cartTotal * (taxRate / 100))
  const finalTotal = cartTotal + shippingCost + taxEstimate

  function validateForm(): boolean {
    if (isPickup) return true
    const errors: Record<string, string> = {}
    if (!firstName.trim()) errors.firstName = "First name is required"
    if (!lastName.trim()) errors.lastName = "Last name is required"
    if (!addressLine1.trim()) errors.addressLine1 = "Address is required"
    if (!city.trim()) errors.city = "City is required"
    if (!postalCode.trim()) {
      errors.postalCode = "Postal code is required"
    } else if (!/^\d{5}$/.test(postalCode.trim())) {
      errors.postalCode = "Enter a valid 5-digit ZIP code"
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  useEffect(() => {
    if (shippingMethod === "pickup") {
      setPaymentMethod("pay_in_store")
      setFieldErrors({})
    } else {
      setPaymentMethod("credit_card")
    }
  }, [shippingMethod])

  // Restore form from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("tcg-checkout-form")
      if (saved) {
        const data = JSON.parse(saved)
        if (data.firstName !== undefined) setFirstName(data.firstName)
        if (data.lastName !== undefined) setLastName(data.lastName)
        if (data.addressLine1 !== undefined) setAddressLine1(data.addressLine1)
        if (data.city !== undefined) setCity(data.city)
        if (data.postalCode !== undefined) setPostalCode(data.postalCode)
        if (data.shippingMethod !== undefined) setShippingMethod(data.shippingMethod)
      }
    } catch {}
  }, [])

  // Save form to sessionStorage on every change
  useEffect(() => {
    try {
      sessionStorage.setItem(
        "tcg-checkout-form",
        JSON.stringify({
          firstName,
          lastName,
          addressLine1,
          city,
          postalCode,
          shippingMethod,
        })
      )
    } catch {}
  }, [firstName, lastName, addressLine1, city, postalCode, shippingMethod])

  useEffect(() => {
    if (status === "unauthenticated") router.push("/shop/login?callbackUrl=/shop/checkout")
  }, [status, router])

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setHasAttemptedSubmit(true)
    if (!validateForm()) return
    setIsProcessing(true)
    setErrorMsg("")

    try {
      if (paymentMethod === "credit_card") {
        const stripeResult = await createStripeSession({
          items: items,
          email: session?.user?.email || "guest@example.com",
          total: finalTotal,
        })

        if ("error" in stripeResult) {
          setErrorMsg(stripeResult.error || "Payment session failed")
          return
        }
        if (stripeResult.url) {
          sessionStorage.removeItem("tcg-checkout-form")
          window.location.href = stripeResult.url
          return
        }
      }

      const result = await placeInStoreOrder({
        customerEmail: session?.user?.email || "guest@example.com",
        items: items,
        subtotal: cartTotal,
        tax: taxEstimate,
        total: finalTotal,
        fulfillment: isPickup ? "PICKUP" : "SHIPPING",
        addressLine1: addressLine1 || undefined,
        city: city || undefined,
        postalCode: postalCode || undefined,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        idempotencyKey: idempotencyKeyRef.current,
      })

      if (result.success && result.order) {
        setConfirmedOrder(result.order)
        setStep(2)
        clearCart()
        sessionStorage.removeItem("tcg-checkout-form")
        // Regenerate idempotency key so a fresh checkout session gets a new key
        idempotencyKeyRef.current = crypto.randomUUID()
        window.scrollTo(0, 0)
      } else {
        throw new Error(result.error || "Checkout failed.")
      }
    } catch (error: unknown) {
      console.error(error)
      setErrorMsg(error instanceof Error ? error.message : "Transaction failed.")
      setIsProcessing(false)
    }
  }

  if (!isHydrated || status === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium animate-pulse">Accessing your vault...</p>
      </div>
    )
  }

  if (items.length === 0 && step === 1) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
        <h2 className="text-2xl font-bold text-foreground">Your cart is empty</h2>
        <div className="mt-8">
          <Button asChild>
            <Link href="/shop">Browse Catalog</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (step === 2 && confirmedOrder) {
    return <OrderSuccessView order={confirmedOrder} isLoggedIn={status === "authenticated"} />
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans text-foreground">
      <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-card sticky top-0 z-10">
        <Link href="/shop" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground transition-transform group-hover:scale-105">
            <Layers className="w-4 h-4" />
          </div>
          <span className="text-base font-bold tracking-tight text-foreground">TCG Vault</span>
        </Link>
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-md border border-border">
          <Lock className="w-3 h-3" /> Secure Checkout
        </div>
      </header>

      <div className="flex-1 lg:flex overflow-hidden h-[calc(100vh-56px)]">
        {/* LEFT: FORMS */}
        <div className="flex-1 overflow-y-auto lg:border-r border-border">
          <div className="max-w-2xl ml-auto mr-auto lg:mr-0 p-8 lg:p-12 lg:pr-[5%] pb-24 lg:pb-12">
            <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-8">
              <Link href="/shop/cart" className="hover:text-primary transition-colors">
                Cart
              </Link>
              <ChevronRight className="w-3 h-3" />
              <span className="font-semibold text-foreground">Information</span>
            </nav>

            {/* Mobile Order Summary Accordion -- hidden on desktop */}
            {step === 1 && (
              <div className="lg:hidden mb-6">
                <Accordion type="single" collapsible>
                  <AccordionItem value="order-summary" className="border border-border rounded-lg">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-2">
                        <span className="text-sm font-semibold text-foreground">
                          Order Summary{" "}
                          <span className="font-normal text-muted-foreground">
                            ({cartCount} {cartCount === 1 ? "item" : "items"})
                          </span>
                        </span>
                        <span className="text-sm font-bold text-foreground">
                          ${(finalTotal / 100).toFixed(2)}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <OrderItemList items={items} />
                      <div className="mt-4 pt-4 border-t border-border">
                        <OrderTotals
                          cartTotal={cartTotal}
                          shippingCost={shippingCost}
                          taxEstimate={taxEstimate}
                          finalTotal={finalTotal}
                          isPickup={isPickup}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            )}

            <form
              ref={formRef}
              id="checkout-form"
              onSubmit={handlePlaceOrder}
              noValidate
              className="flex flex-col gap-8"
            >
              {/* Delivery */}
              <section className="space-y-4">
                <h2 className="text-base font-semibold text-foreground">Delivery Method</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div
                    onClick={() => setShippingMethod("pickup")}
                    className={cn(
                      "flex flex-col p-4 border rounded-lg cursor-pointer transition-all",
                      shippingMethod === "pickup"
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <Store
                      className={cn(
                        "w-4 h-4 mb-2",
                        shippingMethod === "pickup" ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    <span className="text-sm font-semibold text-foreground">In-Store Pickup</span>
                    <span className="text-xs text-muted-foreground mt-0.5">
                      Free · Ready in 2 hours
                    </span>
                  </div>
                  <div
                    onClick={() => setShippingMethod("standard")}
                    className={cn(
                      "flex flex-col p-4 border rounded-lg cursor-pointer transition-all",
                      shippingMethod !== "pickup"
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <Truck
                      className={cn(
                        "w-4 h-4 mb-2",
                        shippingMethod !== "pickup" ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    <span className="text-sm font-semibold text-foreground">Standard Shipping</span>
                    <span className="text-xs text-muted-foreground mt-0.5">
                      $4.99 · 3–5 business days
                    </span>
                  </div>
                </div>
              </section>

              {/* Address */}
              {!isPickup && (
                <section className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <h2 className="text-base font-semibold text-foreground">Shipping Address</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-1 space-y-1.5">
                      <Label htmlFor="firstName">First name</Label>
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="First name"
                        value={firstName}
                        onChange={(e) => {
                          setFirstName(e.target.value)
                          if (hasAttemptedSubmit)
                            setFieldErrors((prev) => ({ ...prev, firstName: "" }))
                        }}
                        className={cn(
                          "h-11",
                          fieldErrors.firstName &&
                            "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
                        )}
                      />
                      {fieldErrors.firstName && (
                        <p className="text-xs text-destructive mt-1">{fieldErrors.firstName}</p>
                      )}
                    </div>
                    <div className="col-span-1 space-y-1.5">
                      <Label htmlFor="lastName">Last name</Label>
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Last name"
                        value={lastName}
                        onChange={(e) => {
                          setLastName(e.target.value)
                          if (hasAttemptedSubmit)
                            setFieldErrors((prev) => ({ ...prev, lastName: "" }))
                        }}
                        className={cn(
                          "h-11",
                          fieldErrors.lastName &&
                            "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
                        )}
                      />
                      {fieldErrors.lastName && (
                        <p className="text-xs text-destructive mt-1">{fieldErrors.lastName}</p>
                      )}
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <Label htmlFor="addressLine1">Address</Label>
                      <Input
                        id="addressLine1"
                        type="text"
                        placeholder="Address"
                        value={addressLine1}
                        onChange={(e) => {
                          setAddressLine1(e.target.value)
                          if (hasAttemptedSubmit)
                            setFieldErrors((prev) => ({ ...prev, addressLine1: "" }))
                        }}
                        className={cn(
                          "h-11",
                          fieldErrors.addressLine1 &&
                            "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
                        )}
                      />
                      {fieldErrors.addressLine1 && (
                        <p className="text-xs text-destructive mt-1">{fieldErrors.addressLine1}</p>
                      )}
                    </div>
                    <div className="col-span-1 space-y-1.5">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        type="text"
                        placeholder="City"
                        value={city}
                        onChange={(e) => {
                          setCity(e.target.value)
                          if (hasAttemptedSubmit) setFieldErrors((prev) => ({ ...prev, city: "" }))
                        }}
                        className={cn(
                          "h-11",
                          fieldErrors.city &&
                            "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
                        )}
                      />
                      {fieldErrors.city && (
                        <p className="text-xs text-destructive mt-1">{fieldErrors.city}</p>
                      )}
                    </div>
                    <div className="col-span-1 space-y-1.5">
                      <Label htmlFor="postalCode">Postal code</Label>
                      <Input
                        id="postalCode"
                        type="text"
                        placeholder="Postal Code"
                        value={postalCode}
                        onChange={(e) => {
                          setPostalCode(e.target.value)
                          if (hasAttemptedSubmit)
                            setFieldErrors((prev) => ({ ...prev, postalCode: "" }))
                        }}
                        className={cn(
                          "h-11",
                          fieldErrors.postalCode &&
                            "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
                        )}
                      />
                      {fieldErrors.postalCode && (
                        <p className="text-xs text-destructive mt-1">{fieldErrors.postalCode}</p>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* Payment */}
              <section className="space-y-4">
                <h2 className="text-base font-semibold text-foreground">Payment Method</h2>
                <div className="space-y-2">
                  <div
                    onClick={() => {
                      if (isPickup) setPaymentMethod("pay_in_store")
                    }}
                    className={cn(
                      "flex items-center gap-4 p-4 border rounded-lg transition-all",
                      paymentMethod === "pay_in_store"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50",
                      !isPickup ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                    )}
                  >
                    <div className="w-9 h-9 bg-card rounded-lg flex items-center justify-center border border-border shrink-0">
                      <Banknote className="w-4 h-4 text-success" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">Pay in Store</p>
                      <p className="text-xs text-muted-foreground">
                        Pay at the counter when you pick up.
                      </p>
                    </div>
                    {paymentMethod === "pay_in_store" && (
                      <Check className="w-4 h-4 text-primary shrink-0" />
                    )}
                  </div>
                  <div
                    onClick={() => setPaymentMethod("credit_card")}
                    className={cn(
                      "flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all",
                      paymentMethod === "credit_card"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <div className="w-9 h-9 bg-card rounded-lg flex items-center justify-center border border-border shrink-0">
                      <CreditCard className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">Credit Card</p>
                      <p className="text-xs text-muted-foreground">
                        Secure online payment via Stripe.
                      </p>
                    </div>
                    {paymentMethod === "credit_card" && (
                      <Check className="w-4 h-4 text-primary shrink-0" />
                    )}
                  </div>
                </div>
              </section>

              {errorMsg && (
                <div className="p-4 bg-destructive/10 text-destructive text-sm font-medium rounded-lg border border-destructive/20">
                  {errorMsg}
                </div>
              )}

              <Button
                type="submit"
                disabled={isProcessing || items.length === 0}
                className="w-full h-12 text-sm font-bold hidden lg:flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {isPickup ? "Confirm Reservation" : "Place Order"}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* RIGHT: ORDER SUMMARY */}
        <div className="hidden lg:block w-[42%] bg-muted/30 border-l border-border overflow-y-auto">
          <div className="max-w-md p-12 pl-[5%]">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6">
              Order Summary
            </h3>
            <div className="mb-8">
              <OrderItemList items={items} />
            </div>

            <div className="pt-5 border-t border-border">
              <OrderTotals
                cartTotal={cartTotal}
                shippingCost={shippingCost}
                taxEstimate={taxEstimate}
                finalTotal={finalTotal}
                isPickup={isPickup}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom Bar -- hidden on desktop */}
      {step === 1 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-card border-t border-border shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="flex flex-col leading-tight">
              <span className="text-xs text-muted-foreground">
                {cartCount} {cartCount === 1 ? "item" : "items"}
              </span>
              <span className="text-base font-bold text-foreground">
                ${(finalTotal / 100).toFixed(2)}
              </span>
            </div>
            <Button
              type="button"
              disabled={isProcessing || items.length === 0}
              onClick={() => formRef.current?.requestSubmit()}
              className="flex items-center justify-center gap-2 h-10 px-5 text-sm font-bold"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {isPickup ? "Confirm" : "Place Order"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
