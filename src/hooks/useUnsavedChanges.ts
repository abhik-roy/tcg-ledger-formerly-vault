"use client"

import { useEffect } from "react"

/**
 * Guards a modal close against unsaved form state.
 * Registers a beforeunload warning while dirty, and returns a guardedClose
 * function that shows a confirm dialog before calling onClose when dirty.
 *
 * @param isDirty  - true when the form has changes that haven't been saved
 * @param onClose  - the underlying close callback to protect
 * @returns guardedClose — call this instead of onClose directly
 */
export function useUnsavedChanges(isDirty: boolean, onClose: () => void): () => void {
  useEffect(() => {
    if (!isDirty) return
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isDirty])

  function guardedClose() {
    if (!isDirty) {
      onClose()
      return
    }
    if (window.confirm("You have unsaved changes. Discard and close?")) {
      onClose()
    }
  }

  return guardedClose
}
