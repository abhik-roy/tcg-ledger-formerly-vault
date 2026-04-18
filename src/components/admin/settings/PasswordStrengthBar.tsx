"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"

interface PasswordStrengthBarProps {
  password: string
}

const LABELS = ["Very weak", "Weak", "Fair", "Good", "Strong"] as const

function getScore(password: string): number {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/\d/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  return Math.min(score, 4)
}

function getSegmentColor(score: number, index: number): string {
  if (index >= score) return "bg-muted"
  switch (score) {
    case 1:
      return "bg-destructive"
    case 2:
      return "bg-amber-500"
    case 3:
      return "bg-green-400"
    case 4:
      return "bg-green-500"
    default:
      return "bg-muted"
  }
}

export function PasswordStrengthBar({ password }: PasswordStrengthBarProps) {
  const score = useMemo(() => getScore(password), [password])

  if (!password) return null

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className={cn("h-1 flex-1 rounded-full transition-colors", getSegmentColor(score, i))}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{LABELS[score]}</p>
    </div>
  )
}
