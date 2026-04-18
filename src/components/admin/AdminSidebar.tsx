"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import {
  Layers,
  LayoutDashboard,
  Library,
  Settings,
  ShieldCheck,
  PlusSquare,
  History,
  Target,
  Repeat2,
  LogOut,
  Loader2,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getPendingOfferCount } from "@/app/actions/trade-offer"

function NavLink({
  href,
  icon: Icon,
  label,
  badge,
  currentPath,
  onClick,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  badge?: string | number
  currentPath: string
  onClick?: () => void
}) {
  const isActive = currentPath === href
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2.5 rounded-md text-body font-medium transition-all duration-150 mb-0.5 min-h-[44px]",
        isActive
          ? "bg-primary/15 text-primary font-semibold"
          : "text-foreground/70 hover:bg-primary/10 hover:text-primary"
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {label}
      {badge != null && (
        <span className="ml-auto bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-caption font-bold">
          {badge}
        </span>
      )}
    </Link>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 mb-2 text-caption font-bold text-muted-foreground uppercase tracking-widest">
      {children}
    </div>
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
  const perms = user?.permissions

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

  return (
    <aside
      className={cn(
        "bg-card border-r border-border flex flex-col h-full shrink-0 z-20",
        mobile ? "w-[260px]" : "w-[220px]"
      )}
    >
      {/* Logo */}
      <div className="px-5 pt-5 pb-5 flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground shadow-sm shrink-0">
          <Layers className="w-4.5 h-4.5" />
        </div>
        <span className="font-bold text-base tracking-tight text-foreground">TCG Ledger</span>
        {mobile && onClose && (
          <button
            onClick={onClose}
            className="ml-auto w-9 h-9 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <div className="flex-1 px-3 space-y-5 overflow-y-auto py-1">
        {/* Collection */}
        <div>
          <SectionLabel>Collection</SectionLabel>
          <NavLink
            href="/admin"
            icon={LayoutDashboard}
            label="Dashboard"
            currentPath={pathname}
            onClick={handleNavClick}
          />
          <NavLink
            href="/admin/collection"
            icon={Library}
            label="Collection"
            currentPath={pathname}
            onClick={handleNavClick}
          />
          <NavLink
            href="/admin/targets"
            icon={Target}
            label="Targets"
            currentPath={pathname}
            onClick={handleNavClick}
          />
          {(isAdmin || perms?.addCardsAccess) && (
            <NavLink
              href="/admin/add-cards"
              icon={PlusSquare}
              label="Add Cards"
              currentPath={pathname}
              onClick={handleNavClick}
            />
          )}
          <NavLink
            href="/admin/ledger"
            icon={History}
            label="Ledger"
            currentPath={pathname}
            onClick={handleNavClick}
          />
          <NavLink
            href="/admin/trade-binder"
            icon={Repeat2}
            label="Trade Binder"
            badge={pendingOffers > 0 ? pendingOffers : undefined}
            currentPath={pathname}
            onClick={handleNavClick}
          />
        </div>

        {/* System -- ADMIN only */}
        {isAdmin && (
          <div>
            <SectionLabel>System</SectionLabel>
            <NavLink
              href="/admin/users"
              icon={ShieldCheck}
              label="Users"
              currentPath={pathname}
              onClick={handleNavClick}
            />
            <NavLink
              href="/admin/settings"
              icon={Settings}
              label="Settings"
              currentPath={pathname}
              onClick={handleNavClick}
            />
          </div>
        )}
      </div>

      {/* User profile */}
      <div className="p-3 border-t border-border shrink-0">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-md">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-label shrink-0">
            {status === "loading" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              getInitials()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate text-foreground leading-tight">
              {status === "loading" ? "Loading..." : displayName}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <span
                className={cn(
                  "text-[11px] font-bold px-1.5 py-0.5 rounded-full leading-none",
                  isAdmin
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "bg-warning/10 text-warning border border-warning/20"
                )}
              >
                {isAdmin ? "ADMIN" : "USER"}
              </span>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            title="Sign out"
            className="w-9 h-9 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
