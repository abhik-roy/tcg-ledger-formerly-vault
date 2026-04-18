"use client"

import { useState } from "react"
import { Lock, Delete } from "lucide-react"
import { verifyPOSPinAction } from "@/app/actions/pos"

interface POSExitModalProps {
  onClose: () => void
  onVerified: () => void
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"]

export function POSExitModal({ onClose, onVerified }: POSExitModalProps) {
  const [pin, setPin] = useState("")
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)

  async function handleDigit(key: string) {
    if (loading) return

    if (key === "back") {
      setPin((p) => p.slice(0, -1))
      setError(false)
      return
    }

    if (key === "") return

    const next = pin + key
    if (next.length > 4) return

    setPin(next)
    setError(false)

    if (next.length === 4) {
      setLoading(true)
      try {
        const res = await verifyPOSPinAction(next)
        if (res.valid) {
          onVerified()
        } else {
          setError(true)
          setShake(true)
          setPin("")
          setTimeout(() => setShake(false), 600)
        }
      } catch {
        setError(true)
        setPin("")
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="bg-card border border-border rounded-xl w-full max-w-xs p-6 text-center"
        style={shake ? { animation: "shake 0.5s ease-in-out" } : {}}
      >
        {/* Icon */}
        <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6" />
        </div>

        <h2 className="font-bold text-base text-foreground">Exit POS</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-5">Enter PIN to return to admin</p>

        {/* PIN dots */}
        <div className="flex items-center justify-center gap-3 mb-5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={[
                "w-3 h-3 rounded-full border-2 transition-colors",
                pin.length > i ? "bg-primary border-primary" : "bg-transparent border-border",
                error ? "border-destructive" : "",
              ].join(" ")}
            />
          ))}
        </div>

        {/* Error */}
        {error && <p className="text-xs text-destructive mb-3 font-medium">Incorrect PIN</p>}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {KEYS.map((key, idx) => {
            if (key === "") {
              return <div key={idx} />
            }
            if (key === "back") {
              return (
                <button
                  key={idx}
                  onClick={() => handleDigit("back")}
                  disabled={loading || pin.length === 0}
                  className="h-14 w-full rounded-lg border border-border text-foreground hover:bg-muted/50 transition-colors flex items-center justify-center disabled:opacity-30"
                >
                  <Delete className="w-4 h-4" />
                </button>
              )
            }
            return (
              <button
                key={idx}
                onClick={() => handleDigit(key)}
                disabled={loading || pin.length >= 4}
                className="h-14 w-full rounded-lg text-lg font-medium border border-border text-foreground hover:bg-muted/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {key}
              </button>
            )
          })}
        </div>

        {/* Cancel */}
        <button
          onClick={onClose}
          className="w-full h-9 border border-border rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          Cancel
        </button>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  )
}
