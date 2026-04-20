"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import {
  LayoutDashboard,
  Library,
  Target,
  History,
  PlusSquare,
  Repeat2,
  Inbox,
  Users,
  Settings,
  LogOut,
  Loader2,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SectionLabel } from "@/components/ui/graphite"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { getPendingOfferCount } from "@/app/actions/trade-offer"

interface NavItem {
  href: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  num: string
  badge?: number
}

function NavItemRow({
  item,
  currentPath,
  onClick,
}: {
  item: NavItem
  currentPath: string
  onClick?: () => void
}) {
  const isActive = currentPath === item.href
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-[10px] w-full px-[10px] py-[7px] mb-px rounded-[var(--radius-sm)] text-[12.5px] relative transition-[background,color] duration-[120ms]",
        isActive ? "font-semibold" : "font-[450]"
      )}
      style={{
        color: isActive ? "var(--ink)" : "var(--ink-2)",
        background: isActive ? "var(--surface)" : "transparent",
        boxShadow: isActive ? "inset 0 0 0 1px var(--rule-strong)" : "none",
      }}
      onMouseEnter={(e) => {
        if (!isActive) (e.currentTarget as HTMLAnchorElement).style.background = "var(--bg-sunk)"
      }}
      onMouseLeave={(e) => {
        if (!isActive) (e.currentTarget as HTMLAnchorElement).style.background = "transparent"
      }}
    >
      {/* Active rail */}
      {isActive && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            left: -12,
            top: "50%",
            width: 3,
            height: 16,
            marginTop: -8,
            background: "var(--accent-hot)",
            borderRadius: "0 2px 2px 0",
          }}
        />
      )}

      {/* Numeric prefix */}
      <span
        className="font-mono shrink-0"
        style={{
          width: 18,
          fontSize: 9,
          letterSpacing: "0.18em",
          color: isActive ? "var(--ink-3)" : "var(--ink-4)",
        }}
      >
        {item.num}
      </span>

      <Icon size={14} className="shrink-0" />

      <span className="flex-1">{item.label}</span>

      {item.badge != null && item.badge > 0 && (
        <span
          className="font-mono font-semibold shrink-0"
          style={{
            background: "var(--accent-hot)",
            color: "var(--accent-hot-ink)",
            padding: "1px 6px",
            borderRadius: 999,
            fontSize: 9,
            letterSpacing: "0.04em",
          }}
        >
          {item.badge}
        </span>
      )}
    </Link>
  )
}

interface AdminSidebarProps {
  mobile?: boolean
  onClose?: () => void
}

export function AdminSidebar({ mobile, onClose }: AdminSidebarProps) {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const user = session?.user
  const [pendingOffers, setPendingOffers] = useState<number>(0)

  useEffect(() => {
    getPendingOfferCount().then((result) => {
      if (result.success && result.data > 0) {
        setPendingOffers(result.data)
      }
    })
  }, [])

  const isAdmin = user?.role === "ADMIN"
  const canAddCards = isAdmin || !!user?.permissions?.addCardsAccess

  const displayName = user?.name || user?.email?.split("@")[0] || "Guest"

  const getInitials = () => {
    const source = user?.name || user?.email || "G"
    return source
      .split(/[@ ]/)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
  }

  const handleNavClick = () => {
    if (mobile && onClose) onClose()
  }

  const collectionItems: NavItem[] = [
    { href: "/admin", icon: LayoutDashboard, label: "Dashboard", num: "01" },
    { href: "/admin/collection", icon: Library, label: "Collection", num: "02" },
    { href: "/admin/targets", icon: Target, label: "Targets", num: "03" },
    { href: "/admin/ledger", icon: History, label: "Ledger", num: "04" },
    ...(canAddCards
      ? [{ href: "/admin/add-cards", icon: PlusSquare, label: "Add Cards", num: "05" }]
      : []),
  ]

  const exchangeItems: NavItem[] = [
    {
      href: "/admin/trade-binder",
      icon: Repeat2,
      label: "Trade Binder",
      num: "06",
      badge: pendingOffers > 0 ? pendingOffers : undefined,
    },
    {
      href: "/admin/inbox",
      icon: Inbox,
      label: "Inbox",
      num: "07",
      badge: pendingOffers > 0 ? pendingOffers : undefined,
    },
  ]

  const systemItems: NavItem[] = [
    { href: "/admin/users", icon: Users, label: "Members", num: "08" },
    { href: "/admin/settings", icon: Settings, label: "Settings", num: "09" },
  ]

  return (
    <aside
      className={cn("flex flex-col h-full shrink-0 z-20", mobile ? "w-[260px]" : "w-[228px]")}
      style={{
        background: "var(--bg)",
        borderRight: "1px solid var(--rule)",
      }}
    >
      {/* Wordmark */}
      <div
        className="shrink-0 flex items-baseline gap-2"
        style={{
          padding: "24px 20px 18px",
          borderBottom: "1px solid var(--rule)",
        }}
      >
        <span
          className="serif"
          style={{
            fontSize: 26,
            lineHeight: 0.9,
            letterSpacing: "-0.025em",
          }}
        >
          Binder
          <span style={{ color: "var(--accent-hot)", fontStyle: "italic" }}>.</span>
        </span>
        <span
          className="font-mono uppercase"
          style={{
            fontSize: 9,
            letterSpacing: "0.2em",
            color: "var(--ink-3)",
          }}
        >
          v2.0
        </span>

        {mobile && onClose && (
          <button
            onClick={onClose}
            className="ml-auto w-9 h-9 flex items-center justify-center rounded-md transition-colors"
            style={{ color: "var(--ink-3)" }}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto" style={{ padding: "18px 12px" }}>
        {/* I · Collection */}
        <div className="mb-[22px]">
          <SectionLabel style={{ padding: "0 10px 8px" }}>I · Collection</SectionLabel>
          {collectionItems.map((item) => (
            <NavItemRow
              key={item.href}
              item={item}
              currentPath={pathname}
              onClick={handleNavClick}
            />
          ))}
        </div>

        {/* II · Exchange */}
        <div className="mb-[22px]">
          <SectionLabel style={{ padding: "0 10px 8px" }}>II · Exchange</SectionLabel>
          {exchangeItems.map((item) => (
            <NavItemRow
              key={item.href}
              item={item}
              currentPath={pathname}
              onClick={handleNavClick}
            />
          ))}
        </div>

        {/* III · System — ADMIN only */}
        {isAdmin && (
          <div className="mb-[22px]">
            <SectionLabel style={{ padding: "0 10px 8px" }}>III · System</SectionLabel>
            {systemItems.map((item) => (
              <NavItemRow
                key={item.href}
                item={item}
                currentPath={pathname}
                onClick={handleNavClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid var(--rule)" }}>
        <div className="flex items-center gap-[10px]" style={{ padding: "12px 14px" }}>
          {/* Avatar */}
          <div
            className="shrink-0 rounded-full flex items-center justify-center font-bold"
            style={{
              width: 30,
              height: 30,
              background: "var(--surface)",
              border: "1px solid var(--rule-strong)",
              fontSize: 11,
              color: "var(--ink-2)",
            }}
          >
            {status === "loading" ? <Loader2 className="w-3 h-3 animate-spin" /> : getInitials()}
          </div>

          {/* User info */}
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate" style={{ fontSize: 12, color: "var(--ink)" }}>
              {status === "loading" ? "Loading…" : displayName}
            </div>
            <div
              className="font-mono mt-px"
              style={{
                fontSize: 9.5,
                letterSpacing: "0.06em",
                color: "var(--ink-3)",
              }}
            >
              {isAdmin ? "ADMIN" : "USER"}
            </div>
          </div>

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Sign out */}
          <button
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            title="Sign out"
            className="flex items-center justify-center rounded-[var(--radius-sm)] transition-colors"
            style={{
              width: 28,
              height: 28,
              color: "var(--ink-3)",
              border: "1px solid var(--rule)",
            }}
            aria-label="Sign out"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  )
}
