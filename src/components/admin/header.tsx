"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Menu, Bell } from "lucide-react"
import { Eyebrow } from "@/components/ui/graphite"
import { getPendingOfferCount } from "@/app/actions/trade-offer"

interface AdminHeaderProps {
  onMenuClick?: () => void
  eyebrow?: string
  title?: string
  subtitle?: string
  actions?: React.ReactNode
}

export function AdminHeader({ onMenuClick, eyebrow, title, subtitle, actions }: AdminHeaderProps) {
  const pathname = usePathname()
  const [pendingOffers, setPendingOffers] = useState<number>(0)

  useEffect(() => {
    getPendingOfferCount().then((result) => {
      if (result.success && result.data > 0) {
        setPendingOffers(result.data)
      }
    })
  }, [])

  // Derive title from pathname when not supplied by caller
  const derivedTitle = (() => {
    const segments = pathname.split("/").filter(Boolean)
    // segments[0] is "admin", segments[1] is the section
    const section = segments[1]
    if (!section) return "Dashboard"
    return section
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  })()

  const displayTitle = title ?? derivedTitle

  return (
    <header
      className="flex items-center gap-4 sticky top-0 z-30 px-7 py-3.5 shrink-0"
      style={{
        minHeight: 68,
        background: "var(--bg)",
        borderBottom: "1px solid var(--rule)",
      }}
    >
      {/* Mobile hamburger */}
      {onMenuClick && (
        <button
          onClick={onMenuClick}
          className="lg:hidden flex items-center justify-center rounded-md transition-colors -ml-1"
          style={{ width: 44, height: 44, color: "var(--ink-2)" }}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {eyebrow && <Eyebrow className="mb-1">{eyebrow}</Eyebrow>}
        <div className="flex items-baseline gap-3">
          <h1 className="font-semibold truncate" style={{ fontSize: 20, color: "var(--ink)" }}>
            {displayTitle}
          </h1>
          {subtitle && (
            <span
              className="font-mono shrink-0"
              style={{
                fontSize: 12,
                color: "var(--ink-3)",
                letterSpacing: "0.02em",
              }}
            >
              {subtitle}
            </span>
          )}
        </div>
      </div>

      {/* Caller-supplied actions */}
      {actions}

      {/* Inbox bell */}
      <Link
        href="/admin/inbox"
        className="relative grid place-items-center rounded-sm transition-colors"
        style={{
          width: 34,
          height: 34,
          color: "var(--ink-2)",
          border: "1px solid var(--rule)",
        }}
        aria-label="Inbox"
      >
        <Bell size={15} />
        {pendingOffers > 0 && (
          <span
            className="absolute font-mono font-semibold grid place-items-center"
            style={{
              top: -5,
              right: -5,
              minWidth: 16,
              height: 16,
              padding: "0 4px",
              borderRadius: 999,
              background: "var(--accent-hot)",
              color: "var(--accent-hot-ink)",
              fontSize: 9,
              border: "2px solid var(--bg)",
            }}
          >
            {pendingOffers}
          </span>
        )}
      </Link>
    </header>
  )
}
