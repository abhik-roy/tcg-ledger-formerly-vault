"use client"

import { useTheme } from "next-themes"
import { Sun, Moon, Monitor, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const THEMES = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
] as const

export function AppearanceSection() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Appearance</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Choose how the admin panel looks. System follows your device preference.
        </p>
      </div>

      <div>
        <p className="text-sm font-medium text-foreground mb-3">Interface theme</p>
        <div className="flex gap-3">
          {THEMES.map((opt) => (
            <Button
              key={opt.id}
              variant="ghost"
              onClick={() => setTheme(opt.id)}
              className={cn(
                "relative flex flex-col items-center gap-2 w-24 h-20 rounded-lg border-2 p-3 transition-all",
                theme === opt.id
                  ? "border-primary bg-primary/5 hover:bg-primary/5"
                  : "border-border hover:border-primary/40 hover:bg-muted/30"
              )}
            >
              {theme === opt.id && (
                <Check className="w-3 h-3 text-primary absolute top-1.5 right-1.5" />
              )}
              <opt.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{opt.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
