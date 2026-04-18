"use client"

import { useState, useMemo, useEffect, useCallback, useTransition } from "react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { updateStoreSettings } from "@/app/actions/settings"
import type { StoreSettingsData } from "@/lib/types"

interface ShippingSectionProps {
  settings: StoreSettingsData
  onDirtyChange: (isDirty: boolean) => void
}

export function ShippingSection({ settings, onDirtyChange }: ShippingSectionProps) {
  const [shippingEnabled, setShippingEnabled] = useState(settings.shippingEnabled)
  const [standardRate, setStandardRate] = useState((settings.standardShippingRate / 100).toFixed(2))
  const [expressRate, setExpressRate] = useState((settings.expressShippingRate / 100).toFixed(2))
  const [freeThreshold, setFreeThreshold] = useState(
    (settings.freeShippingThreshold / 100).toFixed(2)
  )
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [isPending, startTransition] = useTransition()

  const isDirty = useMemo(() => {
    return (
      shippingEnabled !== settings.shippingEnabled ||
      Math.round(parseFloat(standardRate || "0") * 100) !== settings.standardShippingRate ||
      Math.round(parseFloat(expressRate || "0") * 100) !== settings.expressShippingRate ||
      Math.round(parseFloat(freeThreshold || "0") * 100) !== settings.freeShippingThreshold
    )
  }, [shippingEnabled, standardRate, expressRate, freeThreshold, settings])

  useEffect(() => {
    onDirtyChange(isDirty)
  }, [isDirty, onDirtyChange])

  const handleSave = useCallback(() => {
    const standardCents = Math.round(parseFloat(standardRate || "0") * 100)
    const expressCents = Math.round(parseFloat(expressRate || "0") * 100)
    const thresholdCents = Math.round(parseFloat(freeThreshold || "0") * 100)

    startTransition(async () => {
      const result = await updateStoreSettings({
        shippingEnabled,
        standardShippingRate: standardCents,
        expressShippingRate: expressCents,
        freeShippingThreshold: thresholdCents,
      })
      if (result.success) {
        toast.success("Shipping settings saved")
        setSavedAt(new Date())
      } else {
        toast.error(result.error ?? "Failed to save shipping settings.")
      }
    })
  }, [shippingEnabled, standardRate, expressRate, freeThreshold])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        if (isDirty) {
          handleSave()
        } else {
          toast("Nothing to save", { icon: "\u2713" })
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isDirty, handleSave])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Shipping</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure shipping rates and options.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="shippingEnabled">Accept shipping orders</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              When disabled, customers can only select pickup at checkout.
            </p>
          </div>
          <Switch
            id="shippingEnabled"
            checked={shippingEnabled}
            onCheckedChange={setShippingEnabled}
          />
        </div>

        <div className={shippingEnabled ? "" : "opacity-50"}>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="standardRate">Standard Shipping Rate</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="standardRate"
                  type="number"
                  step="0.01"
                  min="0"
                  className="pl-7"
                  value={standardRate}
                  onChange={(e) => setStandardRate(e.target.value)}
                  disabled={!shippingEnabled}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expressRate">Express Shipping Rate</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="expressRate"
                  type="number"
                  step="0.01"
                  min="0"
                  className="pl-7"
                  value={expressRate}
                  onChange={(e) => setExpressRate(e.target.value)}
                  disabled={!shippingEnabled}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="freeThreshold">Free Shipping Threshold</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="freeThreshold"
                  type="number"
                  step="0.01"
                  min="0"
                  className="pl-7"
                  value={freeThreshold}
                  onChange={(e) => setFreeThreshold(e.target.value)}
                  disabled={!shippingEnabled}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Orders above this amount qualify for free standard shipping. Set to $0.00 to
                disable.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button disabled={!isDirty || isPending} onClick={handleSave}>
          {isPending ? "Saving\u2026" : "Save changes"}
        </Button>
        {savedAt && (
          <span className="text-xs text-muted-foreground">
            Last saved {formatDistanceToNow(savedAt, { addSuffix: true })}
          </span>
        )}
      </div>
    </div>
  )
}
