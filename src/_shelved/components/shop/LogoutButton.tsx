"use client"

import { signOut } from "next-auth/react"
import { LogOut } from "lucide-react"

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/shop" })}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-destructive bg-destructive/10 hover:bg-destructive/15 rounded-lg transition-colors"
    >
      <LogOut className="w-4 h-4" />
      Sign Out
    </button>
  )
}
