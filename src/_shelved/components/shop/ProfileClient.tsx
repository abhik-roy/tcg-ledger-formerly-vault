"use client"

import { useState, useTransition } from "react"
import {
  Package,
  ChevronDown,
  ChevronUp,
  Lock,
  Eye,
  EyeOff,
  Truck,
  Clock,
  CheckCircle2,
  XCircle,
  CreditCard,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { toast } from "sonner"
import { getMyOrders, changePassword } from "@/app/actions/profile"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrderItem {
  id: string
  name: string
  setName: string
  condition: string
  finish: string
  price: number
  quantity: number
}

interface Order {
  id: string
  customerEmail: string
  subtotal: number
  tax: number
  shippingCost: number
  totalAmount: number
  status: "PENDING" | "PAID" | "COMPLETED" | "CANCELLED"
  fulfillment: "PICKUP" | "SHIPPING"
  paymentMethod: string
  carrier: string | null
  trackingNumber: string | null
  shippedAt: string | null
  createdAt: string
  items: OrderItem[]
}

interface ProfileClientProps {
  initialOrders: Order[]
  initialTotal: number
  initialTotalPages: number
  customerName: string | null | undefined
  customerEmail: string | null | undefined
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatPrice = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount / 100)

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })

const STATUS_CONFIG: Record<
  Order["status"],
  { label: string; copy: string; color: string; icon: React.ReactNode }
> = {
  PENDING: {
    label: "Pending",
    copy: "Awaiting payment",
    color: "bg-warning/10 text-warning",
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  PAID: {
    label: "Paid",
    copy: "Your order is being prepared",
    color: "bg-primary/10 text-primary",
    icon: <CreditCard className="w-3.5 h-3.5" />,
  },
  COMPLETED: {
    label: "Completed",
    copy: "Order completed",
    color: "bg-success/10 text-success",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  CANCELLED: {
    label: "Cancelled",
    copy: "Order cancelled",
    color: "bg-destructive/10 text-destructive",
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
}

// Password validation rules (same as registration)
const PASSWORD_SPECIAL_REGEX = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/

function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters"
  if (password.length > 128) return "Password must be 128 characters or less"
  if (!PASSWORD_SPECIAL_REGEX.test(password))
    return "Password must contain at least one number or special character"
  return null
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function OrderRow({
  order,
  isExpanded,
  onToggle,
}: {
  order: Order
  isExpanded: boolean
  onToggle: () => void
}) {
  const statusConfig = STATUS_CONFIG[order.status]
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden transition-shadow hover:shadow-sm">
      {/* Clickable Order Header */}
      <button
        onClick={onToggle}
        className="w-full bg-muted/30 px-6 py-4 border-b border-border flex flex-wrap gap-y-3 gap-x-6 justify-between items-center text-left cursor-pointer hover:bg-muted/50 transition-colors"
      >
        <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm items-center">
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wider font-bold mb-1">
              Order
            </p>
            <p className="font-mono text-foreground text-xs">#{order.id.slice(-8)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wider font-bold mb-1">
              Date
            </p>
            <p className="font-medium text-foreground">{formatDate(order.createdAt)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wider font-bold mb-1">
              Items
            </p>
            <p className="font-medium text-foreground">{itemCount}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wider font-bold mb-1">
              Total
            </p>
            <p className="font-medium text-foreground">{formatPrice(order.totalAmount)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wider font-bold mb-1">
              Status
            </p>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${statusConfig.color}`}
            >
              {statusConfig.icon}
              {statusConfig.label}
            </span>
          </div>
        </div>
        <div className="text-muted-foreground">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div>
          {/* Status Copy */}
          <div className="px-6 py-3 bg-muted/10 border-b border-border/60">
            <p className="text-sm text-muted-foreground">{statusConfig.copy}</p>

            {/* Tracking info for shipped orders */}
            {order.trackingNumber && (order.status === "COMPLETED" || order.status === "PAID") && (
              <div className="mt-2 flex items-center gap-2 text-sm">
                <Truck className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Tracking:</span>
                <span className="font-mono text-foreground">{order.trackingNumber}</span>
                {order.carrier && <span className="text-muted-foreground">({order.carrier})</span>}
              </div>
            )}
          </div>

          {/* Order Items */}
          <div className="px-6 py-2">
            <ul className="divide-y divide-border/60">
              {order.items.map((item) => (
                <li key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="shrink-0 w-12 h-12 bg-muted/50 rounded-lg flex items-center justify-center text-muted-foreground/40">
                    <Package className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-foreground truncate">{item.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.setName} &bull; <span className="uppercase">{item.condition}</span>{" "}
                      &bull; {item.finish}
                    </p>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <p className="text-sm font-medium text-foreground">{formatPrice(item.price)}</p>
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Order Footer — payment + fulfillment + subtotals */}
          <div className="bg-muted/20 px-6 py-3 border-t border-border text-sm text-muted-foreground">
            <div className="flex flex-wrap gap-x-6 gap-y-1 justify-between">
              <div className="space-y-0.5">
                <p>
                  Payment:{" "}
                  <span className="text-foreground font-medium">
                    {order.paymentMethod === "PAY_IN_STORE" ? "Pay in Store" : "Card (Stripe)"}
                  </span>
                </p>
                <p>
                  Fulfillment:{" "}
                  <span className="text-foreground font-medium">
                    {order.fulfillment === "SHIPPING" ? "Shipping" : "Pickup"}
                  </span>
                </p>
              </div>
              <div className="text-right space-y-0.5">
                <p>
                  Subtotal:{" "}
                  <span className="text-foreground font-medium">{formatPrice(order.subtotal)}</span>
                </p>
                {order.tax > 0 && (
                  <p>
                    Tax:{" "}
                    <span className="text-foreground font-medium">{formatPrice(order.tax)}</span>
                  </p>
                )}
                {order.shippingCost > 0 && (
                  <p>
                    Shipping:{" "}
                    <span className="text-foreground font-medium">
                      {formatPrice(order.shippingCost)}
                    </span>
                  </p>
                )}
                <p className="font-bold text-foreground">Total: {formatPrice(order.totalAmount)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match")
      return
    }

    const validationError = validatePassword(newPassword)
    if (validationError) {
      setError(validationError)
      return
    }

    startTransition(async () => {
      try {
        const result = await changePassword(currentPassword, newPassword)
        if (result.success) {
          toast.success("Password changed successfully")
          setCurrentPassword("")
          setNewPassword("")
          setConfirmPassword("")
        } else {
          setError(result.error)
        }
      } catch {
        setError("An unexpected error occurred")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">{error}</div>
      )}

      {/* Current Password */}
      <div>
        <label
          htmlFor="current-password"
          className="block text-sm font-medium text-foreground mb-1.5"
        >
          Current Password
        </label>
        <div className="relative">
          <input
            id="current-password"
            type={showCurrent ? "text" : "password"}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full px-3 py-2 pr-10 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          <button
            type="button"
            onClick={() => setShowCurrent(!showCurrent)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* New Password */}
      <div>
        <label htmlFor="new-password" className="block text-sm font-medium text-foreground mb-1.5">
          New Password
        </label>
        <div className="relative">
          <input
            id="new-password"
            type={showNew ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="w-full px-3 py-2 pr-10 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            placeholder="Min 8 chars, 1 number or special char"
          />
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Confirm New Password */}
      <div>
        <label
          htmlFor="confirm-password"
          className="block text-sm font-medium text-foreground mb-1.5"
        >
          Confirm New Password
        </label>
        <input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
        {isPending ? "Changing..." : "Change Password"}
      </button>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ProfileClient({
  initialOrders,
  initialTotal,
  initialTotalPages,
  customerName,
  customerEmail,
}: ProfileClientProps) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(initialTotalPages)
  const [totalOrders, setTotalOrders] = useState(initialTotal)
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)
  const [isLoadingPage, startPageTransition] = useTransition()

  const totalSpent = orders.reduce((sum, o) => sum + o.totalAmount, 0)

  const getInitials = (name?: string | null) => {
    if (!name) return "Me"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
  }

  const goToPage = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === page) return
    startPageTransition(async () => {
      try {
        const result = await getMyOrders(newPage)
        // Next.js serializes Date fields to strings across the Server Action boundary.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setOrders(result.orders as any)
        setPage(newPage)
        setTotalPages(result.totalPages)
        setTotalOrders(result.total)
        setExpandedOrderId(null)
      } catch {
        toast.error("Failed to load orders")
      }
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column: Profile Card + Change Password */}
      <div className="lg:col-span-1 space-y-6">
        {/* Profile Card */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-6 text-center border-b border-border">
            <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              {getInitials(customerName)}
            </div>
            <h2 className="text-xl font-bold text-foreground">
              {customerName || "Valued Customer"}
            </h2>
            <p className="text-muted-foreground text-sm">{customerEmail}</p>
            <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
              Customer Account
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 divide-x divide-border">
            <div className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Orders
              </p>
              <p className="text-xl font-bold text-foreground">{totalOrders}</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Spent
              </p>
              <p className="text-xl font-bold text-foreground">{formatPrice(totalSpent)}</p>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              Change Password
            </h3>
          </div>
          <div className="p-4">
            <ChangePasswordForm />
          </div>
        </div>
      </div>

      {/* Right Column: Order History */}
      <div className="lg:col-span-2 space-y-6">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          Order History
        </h3>

        {orders.length === 0 && page === 1 ? (
          <div className="bg-card rounded-2xl border border-dashed border-border p-12 text-center">
            <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <h3 className="text-lg font-medium text-foreground">No orders yet</h3>
            <p className="text-muted-foreground max-w-sm mx-auto mt-2">
              When you purchase cards or sealed products, they will appear here.
            </p>
            <a
              href="/shop"
              className="mt-6 inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-lg text-primary-foreground bg-primary hover:bg-primary/90 transition-colors"
            >
              Start Shopping
            </a>
          </div>
        ) : (
          <>
            <div className={`space-y-4 ${isLoadingPage ? "opacity-60" : ""}`}>
              {orders.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  isExpanded={expandedOrderId === order.id}
                  onToggle={() =>
                    setExpandedOrderId(expandedOrderId === order.id ? null : order.id)
                  }
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages} ({totalOrders} orders)
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(page - 1)}
                    disabled={page <= 1 || isLoadingPage}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-border bg-card hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Prev
                  </button>
                  <button
                    onClick={() => goToPage(page + 1)}
                    disabled={page >= totalPages || isLoadingPage}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-border bg-card hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
