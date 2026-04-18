"use client"

import { useState, useTransition } from "react"
import { X } from "lucide-react"
import { inviteTeamMember } from "@/app/actions/team"
import type { UserPermissionsInput } from "@/lib/types"

interface InviteUserModalProps {
  onClose: () => void
  onSuccess: () => void
}

const DEFAULT_PERMISSIONS: UserPermissionsInput = {
  inventoryUpdatePrices: false,
  addCardsAccess: true,
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${checked ? "bg-primary" : "bg-muted-foreground/30"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-card rounded-full shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`}
      />
    </button>
  )
}

function PermRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-foreground">{label}</span>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  )
}

function PermSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-muted/30 border border-border rounded-lg p-3 space-y-0.5">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
        {title}
      </div>
      {children}
    </div>
  )
}

export function InviteUserModal({ onClose, onSuccess }: InviteUserModalProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<"ADMIN" | "USER">("USER")
  const [perms, setPerms] = useState<UserPermissionsInput>({ ...DEFAULT_PERMISSIONS })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function setPerm<K extends keyof UserPermissionsInput>(key: K, value: boolean) {
    setPerms((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Name, email and password are required.")
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await inviteTeamMember({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        permissions: role === "USER" ? perms : undefined,
      })
      if (result.success) {
        onSuccess()
      } else {
        setError(result.error || "Failed to invite member.")
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold text-foreground">Invite Team Member</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full bg-muted/40 border border-border rounded-md px-3 h-9 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:bg-card transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Email <span className="text-destructive">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full bg-muted/40 border border-border rounded-md px-3 h-9 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:bg-card transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Temporary Password <span className="text-destructive">*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              className="w-full bg-muted/40 border border-border rounded-md px-3 h-9 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:bg-card transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Role</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRole("ADMIN")}
                className={`flex-1 h-9 rounded-md text-sm font-medium transition-colors border ${
                  role === "ADMIN"
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "border-border text-foreground/70 hover:bg-muted/50"
                }`}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => setRole("USER")}
                className={`flex-1 h-9 rounded-md text-sm font-medium transition-colors border ${
                  role === "USER"
                    ? "bg-warning/10 text-warning border-warning/30"
                    : "border-border text-foreground/70 hover:bg-muted/50"
                }`}
              >
                User
              </button>
            </div>
          </div>

          {role === "USER" && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Permissions
              </div>

              <PermSection title="Collection">
                <PermRow
                  label="Update Prices"
                  checked={perms.inventoryUpdatePrices}
                  onChange={(v) => setPerm("inventoryUpdatePrices", v)}
                />
                <PermRow
                  label="Add / Import Cards"
                  checked={perms.addCardsAccess}
                  onChange={(v) => setPerm("addCardsAccess", v)}
                />
              </PermSection>

              <p className="text-xs text-muted-foreground">
                System permissions (Settings, Users) are restricted to Admin role only.
              </p>
            </div>
          )}

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0">
          <button
            onClick={onClose}
            className="border border-border hover:bg-muted/50 h-9 px-4 rounded-md text-sm text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-4 rounded-md text-sm font-medium transition-colors disabled:opacity-60"
          >
            {isPending ? "Inviting..." : "Send Invite"}
          </button>
        </div>
      </div>
    </div>
  )
}
