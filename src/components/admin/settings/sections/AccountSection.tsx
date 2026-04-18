"use client"

import { useState, useMemo, useEffect, useCallback, useTransition } from "react"
import { toast } from "sonner"
import { Eye, EyeOff } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { updateOwnPassword } from "@/app/actions/settings"
import { PasswordStrengthBar } from "../PasswordStrengthBar"

interface AccountSectionProps {
  onDirtyChange: (isDirty: boolean) => void
}

export function AccountSection({ onDirtyChange }: AccountSectionProps) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errors, setErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({})
  const [isPending, startTransition] = useTransition()

  const isDirty = useMemo(() => {
    return currentPassword !== "" || newPassword !== "" || confirmPassword !== ""
  }, [currentPassword, newPassword, confirmPassword])

  useEffect(() => {
    onDirtyChange(isDirty)
  }, [isDirty, onDirtyChange])

  function validate(): boolean {
    const newErrors: { newPassword?: string; confirmPassword?: string } = {}

    if (!currentPassword || !newPassword || !confirmPassword) {
      if (!newPassword) newErrors.newPassword = "New password is required."
      if (!confirmPassword) newErrors.confirmPassword = "Please confirm your new password."
      if (!currentPassword) {
        toast.error("Current password is required.")
      }
      setErrors(newErrors)
      return false
    }

    if (newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters."
      setErrors(newErrors)
      return false
    }

    if (confirmPassword !== newPassword) {
      newErrors.confirmPassword = "Passwords do not match."
      setErrors(newErrors)
      return false
    }

    setErrors({})
    return true
  }

  function handleUpdateClick() {
    if (!validate()) return
    setShowConfirm(true)
  }

  const handleConfirm = useCallback(() => {
    startTransition(async () => {
      const result = await updateOwnPassword({ currentPassword, newPassword })
      if (result.success) {
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
        setErrors({})
        setShowConfirm(false)
        toast.success("Password updated successfully")
      } else {
        toast.error(result.error ?? "Failed to update password.")
        setCurrentPassword("")
        setShowConfirm(false)
      }
    })
  }, [currentPassword, newPassword])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        if (isDirty && !showConfirm) {
          if (validate()) setShowConfirm(true)
        } else if (!isDirty) {
          toast("Nothing to save", { icon: "\u2713" })
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isDirty, showConfirm, currentPassword, newPassword, confirmPassword])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Account</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Update your account password.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="currentPassword">Current Password</Label>
          <div className="relative">
            <Input
              id="currentPassword"
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setShowCurrent((v) => !v)}
            >
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="newPassword">New Password</Label>
          <div className="relative">
            <Input
              id="newPassword"
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setShowNew((v) => !v)}
            >
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
          <PasswordStrengthBar password={newPassword} />
          {errors.newPassword && (
            <p className="text-xs text-destructive mt-1">{errors.newPassword}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPwd ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setShowConfirmPwd((v) => !v)}
            >
              {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-destructive mt-1">{errors.confirmPassword}</p>
          )}
        </div>
      </div>

      {showConfirm ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
          <p className="text-sm text-foreground">
            This will log you out of other sessions. Continue?
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleConfirm} disabled={isPending}>
              {isPending ? "Updating\u2026" : "Confirm"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="pt-2">
          <Button disabled={!isDirty} onClick={handleUpdateClick}>
            Update Password
          </Button>
        </div>
      )}
    </div>
  )
}
