"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { SettingsNav } from "./SettingsNav"
import { GeneralSection } from "./sections/GeneralSection"
import { AccountSection } from "./sections/AccountSection"
import { AppearanceSection } from "./sections/AppearanceSection"
import type { StoreSettingsDTO } from "@/lib/dtos"

interface SettingsClientProps {
  settings: StoreSettingsDTO | null
  userRole: string
  initialSection?: string
}

const SECTION_LABELS: Record<string, string> = {
  general: "General",
  account: "Account",
  appearance: "Appearance",
}

const ADMIN_SECTIONS = ["general", "account", "appearance"]
const USER_SECTIONS = ["account", "appearance"]

export function SettingsClient({ settings, userRole, initialSection }: SettingsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isAdmin = userRole === "ADMIN"

  const accessibleSections = isAdmin ? ADMIN_SECTIONS : USER_SECTIONS
  const defaultSection = isAdmin ? "general" : "account"

  const resolvedInitial = useMemo(() => {
    if (initialSection && accessibleSections.includes(initialSection)) {
      return initialSection
    }
    return defaultSection
  }, [initialSection, accessibleSections, defaultSection])

  const [activeSection, setActiveSection] = useState(resolvedInitial)
  const [dirtyMap, setDirtyMap] = useState<Record<string, boolean>>({})
  const [pendingSection, setPendingSection] = useState<string | null>(null)

  const switchSection = useCallback(
    (section: string) => {
      setActiveSection(section)
      const params = new URLSearchParams(searchParams.toString())
      params.set("section", section)
      router.replace(`?${params.toString()}`)
      setPendingSection(null)
    },
    [router, searchParams]
  )

  const navigateTo = useCallback(
    (section: string) => {
      if (dirtyMap[activeSection]) {
        setPendingSection(section)
        return
      }
      switchSection(section)
    },
    [dirtyMap, activeSection, switchSection]
  )

  const onGeneralDirty = useCallback(
    (isDirty: boolean) => setDirtyMap((prev) => ({ ...prev, general: isDirty })),
    []
  )
  const onAccountDirty = useCallback(
    (isDirty: boolean) => setDirtyMap((prev) => ({ ...prev, account: isDirty })),
    []
  )

  // Browser navigation guard
  useEffect(() => {
    const anyDirty = Object.values(dirtyMap).some(Boolean)
    if (!anyDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [dirtyMap])

  const mobileItems = useMemo(() => {
    return accessibleSections.map((id) => ({
      id,
      label: SECTION_LABELS[id],
    }))
  }, [accessibleSections])

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Toolbar */}
      <div className="h-12 border-b border-border flex items-center gap-2 px-6 shrink-0">
        <span className="text-sm font-semibold text-foreground">Settings</span>
        <span className="text-muted-foreground text-sm">{"\u203A"}</span>
        <span className="text-sm text-muted-foreground">{SECTION_LABELS[activeSection]}</span>
      </div>

      {/* Mobile horizontal tabs */}
      <div className="lg:hidden border-b border-border bg-card overflow-x-auto flex shrink-0">
        {mobileItems.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            onClick={() => navigateTo(item.id)}
            className={cn(
              "flex items-center gap-1.5 h-10 px-4 text-sm whitespace-nowrap transition-colors shrink-0 rounded-none",
              activeSection === item.id
                ? "text-primary font-medium border-b-2 border-primary hover:bg-transparent hover:text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-transparent"
            )}
          >
            {item.label}
            {dirtyMap[item.id] && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
          </Button>
        ))}
      </div>

      {/* Body: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - desktop only */}
        <div className="hidden lg:block w-[220px] shrink-0 border-r border-border bg-card overflow-y-auto">
          <SettingsNav
            activeSection={activeSection}
            dirtyMap={dirtyMap}
            isAdmin={isAdmin}
            onNavigate={navigateTo}
          />
        </div>

        {/* Content pane */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-xl space-y-6">
            {/* Discard confirmation */}
            {pendingSection && (
              <div className="rounded-lg border border-border bg-muted/30 p-4 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-3">
                  <p className="text-sm text-foreground">
                    You have unsaved changes. Discard and switch?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setDirtyMap((prev) => ({ ...prev, [activeSection]: false }))
                        switchSection(pendingSection)
                      }}
                    >
                      Discard
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setPendingSection(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "general" && isAdmin && settings && (
              <GeneralSection settings={settings} onDirtyChange={onGeneralDirty} />
            )}
            {activeSection === "account" && <AccountSection onDirtyChange={onAccountDirty} />}
            {activeSection === "appearance" && <AppearanceSection />}
          </div>
        </div>
      </div>
    </div>
  )
}
