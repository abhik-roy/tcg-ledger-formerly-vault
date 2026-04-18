"use client"

import { useState } from "react"
import { Loader2, Layers, AlertCircle, CheckCircle2 } from "lucide-react"
import Link from "next/link"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      if (res.status === 429) {
        setError("Too many requests. Please wait a few minutes and try again.")
      } else if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.message || "Something went wrong. Please try again.")
      } else {
        setSent(true)
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm mb-8 flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <Layers className="w-5 h-5 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Reset your password</h1>
        <p className="text-sm text-muted-foreground text-center">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      <div className="w-full max-w-sm bg-card rounded-xl shadow-sm border border-border overflow-hidden p-8">
        {sent ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-success" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-foreground">Check your email</p>
              <p className="text-xs text-muted-foreground">
                If an account exists for <strong>{email}</strong>, we&apos;ve sent a password reset
                link. It expires in 1 hour.
              </p>
            </div>
            <Link
              href="/shop/login"
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              &larr; Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg flex items-center gap-2 border border-destructive/20">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                required
                className="w-full h-11 px-4 rounded-lg border border-border bg-muted/40 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 focus:bg-card transition-all"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full h-11 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending&hellip;
                </>
              ) : (
                "Send Reset Link"
              )}
            </button>

            <div className="text-center">
              <Link
                href="/shop/login"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                &larr; Back to login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
