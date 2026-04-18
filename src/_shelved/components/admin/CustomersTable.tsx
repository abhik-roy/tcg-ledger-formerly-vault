"use client"

import { Users } from "lucide-react"
import type { CustomerWithStats } from "@/app/actions/customers"

interface CustomersTableProps {
  customers: CustomerWithStats[]
  onSelectCustomer: (customer: CustomerWithStats) => void
  selectedCustomerId?: string
}

function getInitials(c: CustomerWithStats): string {
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email
  return name
    .split(/[@\s]/)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function getDisplayName(firstName: string | null, lastName: string | null): string | null {
  const parts = [firstName, lastName].filter(Boolean)
  return parts.length > 0 ? parts.join(" ") : null
}

export function CustomersTable({
  customers,
  onSelectCustomer,
  selectedCustomerId,
}: CustomersTableProps) {
  if (customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center mb-3">
          <Users className="w-4 h-4 text-muted-foreground/40" />
        </div>
        <p className="text-sm font-medium text-foreground">No customers found</p>
      </div>
    )
  }

  return (
    <table className="w-full text-sm text-left">
      <thead className="bg-muted/50 border-b border-border sticky top-0 z-10">
        <tr>
          <th className="px-5 py-3 text-label font-bold text-muted-foreground uppercase tracking-wider">
            Customer
          </th>
          <th className="px-5 py-3 text-label font-bold text-muted-foreground uppercase tracking-wider w-[130px]">
            Member Since
          </th>
          <th className="px-5 py-3 text-label font-bold text-muted-foreground uppercase tracking-wider w-[90px]">
            Orders
          </th>
          <th className="px-5 py-3 text-label font-bold text-muted-foreground uppercase tracking-wider w-[130px]">
            Lifetime Spend
          </th>
          <th className="px-5 py-3 text-label font-bold text-muted-foreground uppercase tracking-wider w-[80px] text-right">
            View
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {customers.map((customer) => {
          const initials = getInitials(customer)
          const displayName = getDisplayName(customer.firstName, customer.lastName)
          const isSelected = customer.id === selectedCustomerId

          return (
            <tr
              key={customer.id}
              className={`transition-colors cursor-pointer ${isSelected ? "bg-primary/5" : "hover:bg-muted/30"}`}
              onClick={() => onSelectCustomer(customer)}
            >
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-foreground truncate">
                      {displayName || customer.email}
                    </div>
                    {displayName && (
                      <div className="text-xs text-muted-foreground truncate">{customer.email}</div>
                    )}
                  </div>
                </div>
              </td>

              <td className="px-5 py-4 text-muted-foreground text-xs">
                {new Date(customer.createdAt).toLocaleDateString()}
              </td>

              <td className="px-5 py-4">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                  {customer.orderCount}
                </span>
              </td>

              <td className="px-5 py-4 font-bold text-foreground tabular-nums">
                ${(customer.lifetimeSpend / 100).toFixed(2)}
              </td>

              <td className="px-5 py-4 text-right">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectCustomer(customer)
                  }}
                  className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  Details →
                </button>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
