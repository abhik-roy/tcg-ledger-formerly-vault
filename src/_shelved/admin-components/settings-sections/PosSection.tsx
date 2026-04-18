"use client"

import { useState, useMemo, useEffect, useCallback, useTransition } from "react"
import { toast } from "sonner"
import { Eye, EyeOff, AlertTriangle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { updateStoreSettings } from "@/app/actions/settings"
import type { StoreSettingsData } from "@/lib/types"

interface PosSectionProps {
  settings: StoreSettingsData
  onDirtyChange: (isDirty: boolean) => void
}

const WEAK_PINS = [
  "1234",
  "0000",
  "1111",
  "2222",
  "3333",
  "4444",
  "5555",
  "6666",
  "7777",
  "8888",
  "9999",
  "1212",
  "0123",
]

export function PosSection({ settings: _settings, onDirtyChange }: PosSectionProps) {
  // DEV-18: The PIN is stored as a bcrypt hash — never display it.
  // The field always starts empty; admin must enter a new PIN to change it.
  const [pin, setPin] = useState("")
  const [showPin, setShowPin] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | undefined>()

  // Dirty when the user has typed a new PIN value
  const isDirty = useMemo(() => pin.length > 0, [pin])

  useEffect(() => {
    onDirtyChange(isDirty)
  }, [isDirty, onDirtyChange])

  const isWeak = useMemo(() => {
    return WEAK_PINS.includes(pin) || (pin.length >= 4 && new Set(pin.split("")).size === 1)
  }, [pin])

  function handlePinChange(value: string) {
    // Only allow numeric input
    const numeric = value.replace(/\D/g, "")
    setPin(numeric)
    setError(undefined)
    setShowConfirm(false)
  }

  function validatePin(): boolean {
    if (!/^\d{4,8}$/.test(pin)) {
      setError("PIN must be 4-8 digits.")
      return false
    }
    setError(undefined)
    return true
  }

  function handleUpdateClick() {
    if (!validatePin()) return
    setShowConfirm(true)
  }

  const handleConfirm = useCallback(() => {
    startTransition(async () => {
      const result = await updateStoreSettings({ posExitPin: pin })
      if (result.success) {
        toast.success("POS PIN updated")
        setShowConfirm(false)
      } else {
        toast.error(result.error ?? "Failed to update PIN.")
      }
    })
  }, [pin])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        if (isDirty) {
          if (validatePin()) setShowConfirm(true)
        } else {
          toast("Nothing to save", { icon: "\u2713" })
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isDirty, pin])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">POS</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Configure Point of Sale settings.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="posPin">Exit PIN</Label>
          <div className="relative">
            <Input
              id="posPin"
              type={showPin ? "text" : "password"}
              inputMode="numeric"
              pattern="[0-9]*"
              value={pin}
              onChange={(e) => handlePinChange(e.target.value)}
              placeholder="••••"
              className="pr-10"
              maxLength={8}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPin((v) => !v)}
            >
              {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            A PIN is already set. Enter a new 4-8 digit PIN to replace it.
          </p>
          {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>

        {isWeak && pin.length >= 4 && !error && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-foreground">
              This PIN is commonly used and easy to guess. Consider a stronger PIN.
            </p>
          </div>
        )}
      </div>

      {showConfirm ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
          <p className="text-sm text-foreground">
            Are you sure you want to change the exit PIN? This will affect all POS sessions.
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
            Update PIN
          </Button>
        </div>
      )}
    </div>
  )
}
