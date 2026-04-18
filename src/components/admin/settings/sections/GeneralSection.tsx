"use client"

import { useState, useMemo, useEffect, useCallback, useTransition } from "react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { updateStoreSettings } from "@/app/actions/settings"
import type { StoreSettingsDTO } from "@/lib/dtos"

interface GeneralSectionProps {
  settings: StoreSettingsDTO
  onDirtyChange: (isDirty: boolean) => void
}

const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
]

export function GeneralSection({ settings, onDirtyChange }: GeneralSectionProps) {
  const [storeName, setStoreName] = useState(settings.storeName)
  const [contactEmail, setContactEmail] = useState(settings.contactEmail ?? "")
  const [currency, setCurrency] = useState(settings.currency)
  const [taxRate, setTaxRate] = useState(String(settings.taxRate))
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [isPending, startTransition] = useTransition()

  const [errors, setErrors] = useState<{
    storeName?: string
    contactEmail?: string
    taxRate?: string
  }>({})

  const isDirty = useMemo(() => {
    return (
      storeName !== settings.storeName ||
      contactEmail !== (settings.contactEmail ?? "") ||
      currency !== settings.currency ||
      taxRate !== String(settings.taxRate)
    )
  }, [storeName, contactEmail, currency, taxRate, settings])

  useEffect(() => {
    onDirtyChange(isDirty)
  }, [isDirty, onDirtyChange])

  function validateField(field: string, value: string) {
    switch (field) {
      case "storeName":
        if (!value.trim()) {
          setErrors((prev) => ({ ...prev, storeName: "Store name is required." }))
        } else if (value.length > 80) {
          setErrors((prev) => ({
            ...prev,
            storeName: "Store name must be 80 characters or fewer.",
          }))
        } else {
          setErrors((prev) => ({ ...prev, storeName: undefined }))
        }
        break
      case "contactEmail":
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          setErrors((prev) => ({ ...prev, contactEmail: "Enter a valid email address." }))
        } else {
          setErrors((prev) => ({ ...prev, contactEmail: undefined }))
        }
        break
      case "taxRate": {
        const parsed = parseFloat(value)
        if (isNaN(parsed) || parsed < 0 || parsed > 100) {
          setErrors((prev) => ({ ...prev, taxRate: "Tax rate must be between 0 and 100." }))
        } else {
          setErrors((prev) => ({ ...prev, taxRate: undefined }))
        }
        break
      }
    }
  }

  const handleSave = useCallback(() => {
    // Re-validate all fields before submitting
    const storeNameError = !storeName.trim()
      ? "Store name is required."
      : storeName.length > 80
        ? "Store name must be 80 characters or fewer."
        : undefined
    const emailError =
      contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)
        ? "Enter a valid email address."
        : undefined
    const parsedTax = parseFloat(taxRate)
    const taxError =
      isNaN(parsedTax) || parsedTax < 0 || parsedTax > 100
        ? "Tax rate must be between 0 and 100."
        : undefined

    if (storeNameError || emailError || taxError) {
      setErrors({ storeName: storeNameError, contactEmail: emailError, taxRate: taxError })
      toast.error("Please fix the form errors before saving.")
      return
    }

    startTransition(async () => {
      const result = await updateStoreSettings({
        storeName: storeName.trim(),
        contactEmail: contactEmail.trim() || null,
        currency,
        taxRate: parsedTax,
      })
      if (result.success) {
        toast.success("Settings saved")
        setSavedAt(new Date())
      } else {
        toast.error(result.error || "Failed to save settings.")
      }
    })
  }, [storeName, contactEmail, currency, taxRate, setErrors])

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
        <h2 className="text-base font-semibold text-foreground">General</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Basic store information.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="storeName">Store Name</Label>
          <Input
            id="storeName"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            onBlur={() => validateField("storeName", storeName)}
            placeholder="My Card Store"
          />
          {errors.storeName && <p className="text-xs text-destructive mt-1">{errors.storeName}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="contactEmail">Contact Email</Label>
          <Input
            id="contactEmail"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            onBlur={() => validateField("contactEmail", contactEmail)}
            placeholder="contact@mystore.com"
          />
          {errors.contactEmail && (
            <p className="text-xs text-destructive mt-1">{errors.contactEmail}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="currency">Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="taxRate">Tax Rate (%)</Label>
            <Input
              id="taxRate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              onBlur={() => validateField("taxRate", taxRate)}
              placeholder="0.00"
            />
            {errors.taxRate && <p className="text-xs text-destructive mt-1">{errors.taxRate}</p>}
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
