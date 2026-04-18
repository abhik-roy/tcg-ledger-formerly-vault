"use client"

import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { User, LogIn, ChevronDown, LogOut, Layers } from "lucide-react"

export default function UserMenu() {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)

  if (!session?.user) {
    return (
      <Link
        href="/shop/login"
        className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-opacity"
      >
        <LogIn className="w-3.5 h-3.5" />
        Sign in
      </Link>
    )
  }

  const initials = session.user.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : (session.user.email?.[0]?.toUpperCase() ?? "U")

  const isAdmin = session.user.role === "ADMIN"

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-foreground hover:text-foreground/80 transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-xs border border-primary/20">
          {initials}
        </div>
        <span className="hidden md:inline text-sm font-medium text-foreground">
          {session.user.name || session.user.email}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-52 bg-card rounded-lg shadow-xl border border-border py-1 z-20 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-2.5 border-b border-border">
              <p className="text-caption text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">
                Signed in as
              </p>
              <p className="text-xs font-semibold text-foreground truncate">{session.user.email}</p>
            </div>

            <Link
              href="/shop/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-foreground/70 hover:bg-muted/50 hover:text-foreground transition-colors"
            >
              <User className="w-3.5 h-3.5" />
              My Profile
            </Link>

            {isAdmin && (
              <Link
                href="/admin/inventory"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-foreground/70 hover:bg-muted/50 hover:text-foreground transition-colors"
              >
                <Layers className="w-3.5 h-3.5" />
                Admin Dashboard
              </Link>
            )}

            <div className="h-px bg-border my-1" />

            <button
              onClick={() => signOut({ callbackUrl: "/shop" })}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  )
}
