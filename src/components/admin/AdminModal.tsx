"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface AdminModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  /** Mono-spaced subtitle shown beneath the title (e.g. order ID) */
  subtitle?: string
  /** Icon rendered inside the header icon slot */
  icon?: React.ReactNode
  children: React.ReactNode
  /** Tailwind max-width class. Defaults to "max-w-2xl" */
  maxWidth?: string
  /**
   * When true, renders at --z-modal-nested (60) instead of --z-modal (50).
   * Use for modals opened from within another modal.
   */
  nested?: boolean
  className?: string
}

/**
 * Shared admin modal shell — backed by Radix UI Dialog for consistent
 * animation, Escape-to-close, focus-trap, and backdrop behavior.
 *
 * Z-index scale (defined in globals.css):
 *   modal    = 50  (--z-modal)
 *   nested   = 60  (--z-modal-nested)
 *   toast    = 70  (--z-toast)
 */
export function AdminModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  maxWidth = "max-w-2xl",
  nested = false,
  className,
}: AdminModalProps) {
  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            nested ? "z-[var(--z-modal-nested)]" : "z-[var(--z-modal)]"
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]",
            "bg-card border border-border rounded-xl shadow-2xl w-full flex flex-col overflow-hidden max-h-[90vh]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
            "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
            nested ? "z-[var(--z-modal-nested)]" : "z-[var(--z-modal)]",
            maxWidth,
            className
          )}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {icon && (
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                <DialogPrimitive.Title className="text-sm font-semibold text-foreground truncate">
                  {title}
                </DialogPrimitive.Title>
                {subtitle && (
                  <p className="text-label text-muted-foreground/60 font-mono mt-0.5 truncate">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            <DialogPrimitive.Close
              className="p-1.5 hover:bg-muted/50 rounded-lg text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-3"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </DialogPrimitive.Close>
          </div>

          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
