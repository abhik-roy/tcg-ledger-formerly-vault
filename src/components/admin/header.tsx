"use client"

import { usePathname } from "next/navigation"
import { ChevronRight, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus } from "lucide-react"

interface AdminHeaderProps {
  onMenuClick?: () => void
}

export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const pathname = usePathname()

  const segments = pathname.split("/").filter(Boolean)
  const currentSection = segments[1]
    ? segments[1].charAt(0).toUpperCase() + segments[1].slice(1)
    : "Dashboard"

  return (
    <header className="h-14 bg-card border-b border-border px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* LEFT: Hamburger + Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuClick}
          className="lg:hidden w-11 h-11 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors -ml-1"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <span className={segments.length === 1 ? "text-foreground font-medium" : ""}>Admin</span>

        {currentSection !== "Dashboard" && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
            <span className="text-foreground font-medium capitalize">{currentSection}</span>
          </>
        )}
      </div>

      {/* RIGHT: Actions */}
      <div className="flex items-center gap-2">
        <Button asChild size="sm" className="gap-1.5 h-9 sm:h-8 text-xs font-semibold min-w-[44px]">
          <Link href="/admin/add-cards">
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Cards</span>
          </Link>
        </Button>
      </div>
    </header>
  )
}
