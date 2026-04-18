"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SettingsNavProps {
  activeSection: string
  dirtyMap: Record<string, boolean>
  isAdmin: boolean
  onNavigate: (section: string) => void
}

interface NavGroup {
  label: string
  items: { id: string; label: string }[]
}

const ADMIN_GROUPS: NavGroup[] = [
  {
    label: "INSTANCE",
    items: [{ id: "general", label: "General" }],
  },
  {
    label: "ACCOUNT",
    items: [
      { id: "account", label: "Account" },
      { id: "appearance", label: "Appearance" },
    ],
  },
]

const USER_GROUPS: NavGroup[] = [
  {
    label: "ACCOUNT",
    items: [
      { id: "account", label: "Account" },
      { id: "appearance", label: "Appearance" },
    ],
  },
]

export function SettingsNav({ activeSection, dirtyMap, isAdmin, onNavigate }: SettingsNavProps) {
  const groups = isAdmin ? ADMIN_GROUPS : USER_GROUPS

  return (
    <nav className="py-3">
      {groups.map((group, gi) => (
        <div key={group.label}>
          <div
            className={cn(
              "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-3 mb-1",
              gi === 0 ? "mt-0" : "mt-4"
            )}
          >
            {group.label}
          </div>
          {group.items.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              onClick={() => onNavigate(item.id)}
              className={cn(
                "w-full flex items-center justify-between h-8 px-3 rounded-md text-sm transition-colors",
                activeSection === item.id
                  ? "bg-primary/10 text-primary font-medium hover:bg-primary/10 hover:text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <span>{item.label}</span>
              {dirtyMap[item.id] && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              )}
            </Button>
          ))}
        </div>
      ))}
    </nav>
  )
}
