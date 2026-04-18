"use client"

import { useState, useTransition } from "react"
import { X, ChevronDown, ChevronUp } from "lucide-react"
import { updateTeamMember, resetTeamMemberPassword } from "@/app/actions/team"
import type { TeamMemberDTO, UserPermissionsDTO } from "@/lib/dtos"
import type { UserPermissionsInput } from "@/lib/types"

interface EditUserModalProps {
  member: TeamMemberDTO
  currentUserId: string
  onClose: () => void
  onSuccess: (updated: TeamMemberDTO) => void
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

export function EditUserModal({ member, currentUserId, onClose, onSuccess }: EditUserModalProps) {
  const isSelf = member.id === currentUserId

  const [name, setName] = useState(member.name ?? "")
  const [role, setRole] = useState<"ADMIN" | "USER">(member.role as "ADMIN" | "USER")
  const [perms, setPerms] = useState<UserPermissionsInput>(
    member.permissions ?? { ...DEFAULT_PERMISSIONS }
  )
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Reset password section
  const [resetOpen, setResetOpen] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetSuccess, setResetSuccess] = useState<string | null>(null)
  const [isResetting, startResetTransition] = useTransition()

  function setPerm<K extends keyof UserPermissionsInput>(key: K, value: boolean) {
    setPerms((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit() {
    if (!name.trim()) {
      setError("Name is required.")
      return
    }
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await updateTeamMember({
        id: member.id,
        name: name.trim(),
        role,
        permissions: role === "USER" ? perms : undefined,
      })
      if (result.success) {
        const updated: TeamMemberDTO = {
          ...member,
          name: name.trim(),
          role,
          permissions: role === "USER" ? (perms as UserPermissionsDTO) : null,
        }
        onSuccess(updated)
      } else {
        setError(result.error || "Failed to update member.")
      }
    })
  }

  function handleResetPassword() {
    if (!newPassword.trim()) {
      setResetError("Please enter a new password.")
      return
    }
    setResetError(null)
    setResetSuccess(null)
    startResetTransition(async () => {
      const result = await resetTeamMemberPassword({ id: member.id, newPassword })
      if (result.success) {
        setResetSuccess("Password reset successfully.")
        setNewPassword("")
      } else {
        setResetError(result.error || "Failed to reset password.")
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Edit Team Member</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{member.email}</p>
          </div>
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
            <label className="text-xs font-medium text-foreground">Role</label>
            {isSelf && (
              <p className="text-xs text-muted-foreground bg-muted/40 border border-border rounded-md px-3 py-2">
                You cannot change your own role.
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => !isSelf && setRole("ADMIN")}
                disabled={isSelf}
                className={`flex-1 h-9 rounded-md text-sm font-medium transition-colors border disabled:opacity-50 disabled:cursor-not-allowed ${
                  role === "ADMIN"
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "border-border text-foreground/70 hover:bg-muted/50"
                }`}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => !isSelf && setRole("USER")}
                disabled={isSelf}
                className={`flex-1 h-9 rounded-md text-sm font-medium transition-colors border disabled:opacity-50 disabled:cursor-not-allowed ${
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
          {success && (
            <p className="text-xs text-success bg-success/10 border border-success/20 rounded-md px-3 py-2">
              {success}
            </p>
          )}

          {/* Reset Password section */}
          <div className="border border-border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setResetOpen((o) => !o)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/30 transition-colors"
            >
              <span>Reset Password</span>
              {resetOpen ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            {resetOpen && (
              <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  className="w-full bg-muted/40 border border-border rounded-md px-3 h-9 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:bg-card transition-colors"
                />
                {resetError && <p className="text-xs text-destructive">{resetError}</p>}
                {resetSuccess && <p className="text-xs text-success">{resetSuccess}</p>}
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={isResetting}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-4 rounded-md text-sm font-medium transition-colors disabled:opacity-60"
                >
                  {isResetting ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            )}
          </div>
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
            {isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  )
}
