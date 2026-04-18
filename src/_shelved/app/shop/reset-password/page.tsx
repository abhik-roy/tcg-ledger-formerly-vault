"use client"

import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2, Layers, AlertCircle, CheckCircle2 } from "lucide-react"
import Link from "next/link"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [succeeded, setSucceeded] = useState(false)
  const [error, setError] = useState("")

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-destructive" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-foreground">Invalid reset link</p>
          <p className="text-xs text-muted-foreground">
            This reset link is invalid or has expired.
          </p>
        </div>
        <Link
          href="/shop/forgot-password"
          className="text-sm text-primary hover:text-primary/80 transition-colors"
        >
          Request a new link
        </Link>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data.message || "Something went wrong. Please try again.")
      } else {
        setSucceeded(true)
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (succeeded) {
    return (
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6 text-success" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-foreground">Password reset!</p>
          <p className="text-xs text-muted-foreground">
            You can now sign in with your new password.
          </p>
        </div>
        <Link
          href="/shop/login"
          className="text-sm text-primary hover:text-primary/80 transition-colors"
        >
          Sign in
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg flex items-center gap-2 border border-destructive/20">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
          {error.includes("expired") && (
            <Link href="/shop/forgot-password" className="ml-auto text-xs underline shrink-0">
              Request new link
            </Link>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          New Password
        </label>
        <input
          type="password"
          required
          className="w-full h-11 px-4 rounded-lg border border-border bg-muted/40 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 focus:bg-card transition-all"
          placeholder="Min. 8 characters"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Confirm Password
        </label>
        <input
          type="password"
          required
          className="w-full h-11 px-4 rounded-lg border border-border bg-muted/40 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 focus:bg-card transition-all"
          placeholder="Repeat your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={loading || !newPassword || !confirmPassword}
        className="w-full h-11 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Resetting&hellip;
          </>
        ) : (
          "Reset Password"
        )}
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm mb-8 flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <Layers className="w-5 h-5 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Set a new password</h1>
        <p className="text-sm text-muted-foreground text-center">
          Choose a strong password with at least 8 characters
        </p>
      </div>

      <div className="w-full max-w-sm bg-card rounded-xl shadow-sm border border-border overflow-hidden p-8">
        <Suspense fallback={<div className="text-sm text-muted-foreground">Loading&hellip;</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
