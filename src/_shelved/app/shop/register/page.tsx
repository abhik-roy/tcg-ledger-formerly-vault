"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { Layers, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"

export default function ShopRegisterPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  })

  const validateForm = (): string | null => {
    // Name (optional but max 100 chars)
    if (formData.name.length > 100) {
      return "Name must be 100 characters or less"
    }

    // Email: valid format, max 255 chars
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      return "Please enter a valid email address"
    }
    if (formData.email.length > 255) {
      return "Email must be 255 characters or less"
    }

    // Password: min 8, max 128, at least 1 number or special char
    if (formData.password.length < 8) {
      return "Password must be at least 8 characters"
    }
    if (formData.password.length > 128) {
      return "Password must be 128 characters or less"
    }
    if (!/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password)) {
      return "Password must contain at least one number or special character"
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      setLoading(false)
      return
    }

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Something went wrong")
      }

      setSuccess(true)

      const loginResult = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        loginType: "customer",
        redirect: false,
      })

      if (loginResult?.ok) {
        router.push("/shop")
        router.refresh()
      } else {
        router.push("/shop/login")
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Brand header */}
      <div className="mb-8 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-400">
        <Link
          href="/shop"
          className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-primary-foreground mb-4 shadow-sm hover:opacity-90 transition-opacity"
        >
          <Layers className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Create an account</h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          Join TCG Vault to track your collection
        </p>
      </div>

      {/* Register card */}
      <div className="w-full max-w-sm bg-card rounded-xl shadow-sm border border-border overflow-hidden p-8 animate-in fade-in zoom-in-95 duration-400">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg flex items-center gap-2 border border-destructive/20">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="bg-success/10 text-success text-sm p-3 rounded-lg flex items-center gap-2 border border-success/20">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Account created! Redirecting...
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Full Name
            </label>
            <input
              type="text"
              maxLength={100}
              className="w-full h-11 px-4 rounded-lg border border-border bg-muted/40 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 focus:bg-card transition-all"
              placeholder="Jane Doe"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              required
              maxLength={255}
              className="w-full h-11 px-4 rounded-lg border border-border bg-muted/40 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 focus:bg-card transition-all"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              required
              maxLength={128}
              className="w-full h-11 px-4 rounded-lg border border-border bg-muted/40 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 focus:bg-card transition-all"
              placeholder="Create a strong password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Min. 8 characters with at least one number or special character
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="h-11 bg-primary hover:opacity-90 text-primary-foreground font-semibold rounded-lg transition-all flex items-center justify-center gap-2 mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
          </button>
        </form>

        <div className="mt-6 text-center pt-5 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/shop/login" className="text-primary font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
