"use client"

import { useState, Suspense } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, AlertCircle, Layers, Eye, EyeOff, CheckCircle2 } from "lucide-react"
import { registerUser } from "@/app/actions/register"

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/admin"

  const [mode, setMode] = useState<"login" | "register">("login")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    displayName: "",
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid email or password.")
        setLoading(false)
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch {
      setError("Connection error. Please try again.")
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    const result = await registerUser({
      email: formData.email,
      password: formData.password,
      displayName: formData.displayName,
    })

    setLoading(false)

    if (result.success) {
      setSuccess("Account created! Signing you in...")
      // Auto-login after registration
      const signInResult = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })
      if (signInResult?.error) {
        setSuccess("")
        setError("Account created but auto-login failed. Please sign in manually.")
        setMode("login")
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } else {
      setError(result.error)
    }
  }

  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login")
    setError("")
    setSuccess("")
  }

  return (
    <div className="w-full max-w-sm px-4">
      {/* Header */}
      <div className="flex flex-col items-center mb-10 text-center">
        <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground mb-5 shadow-lg shadow-primary/20">
          <Layers className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-foreground tracking-tight">TCG Ledger</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {mode === "login" ? "Sign in to your collection." : "Create your account."}
        </p>
      </div>

      {/* Card */}
      <div className="bg-card rounded-2xl shadow-2xl border border-border/50 overflow-hidden p-8 card-glow">
        <form
          onSubmit={mode === "login" ? handleLogin : handleRegister}
          className="flex flex-col gap-5"
        >
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg flex items-center gap-2 border border-destructive/20">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="bg-success/10 text-success text-sm p-3 rounded-lg flex items-center gap-2 border border-success/20">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {success}
            </div>
          )}

          {mode === "register" && (
            <div className="space-y-2">
              <label
                htmlFor="auth-name"
                className="text-xs font-bold text-muted-foreground uppercase tracking-wider"
              >
                Display Name
              </label>
              <input
                id="auth-name"
                type="text"
                required
                className="w-full h-12 px-4 rounded-lg border border-input bg-muted/40 text-foreground focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none transition-all placeholder:text-muted-foreground/50 text-sm"
                placeholder="How your friends will see you"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              />
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor="auth-email"
              className="text-xs font-bold text-muted-foreground uppercase tracking-wider"
            >
              Email Address
            </label>
            <input
              id="auth-email"
              type="email"
              required
              className="w-full h-12 px-4 rounded-lg border border-input bg-muted/40 text-foreground focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none transition-all placeholder:text-muted-foreground/50 text-sm"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="auth-password"
              className="text-xs font-bold text-muted-foreground uppercase tracking-wider"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="auth-password"
                type={showPassword ? "text" : "password"}
                required
                minLength={mode === "register" ? 6 : undefined}
                className="w-full h-12 px-4 pr-12 rounded-lg border border-input bg-muted/40 text-foreground focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none transition-all placeholder:text-muted-foreground/50 text-sm"
                placeholder={mode === "register" ? "Min 6 characters" : "Enter your password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed text-sm min-h-[44px]"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : mode === "login" ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        {/* Toggle */}
        <div className="mt-6 pt-5 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">
            {mode === "login" ? "Don\u2019t have an account?" : "Already have an account?"}{" "}
            <button
              onClick={switchMode}
              className="text-primary font-semibold hover:underline"
              type="button"
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-caption text-muted-foreground mt-6">
        Track your collection, share your trade binder
      </p>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen gradient-mesh flex flex-col items-center justify-center p-4">
      <Suspense fallback={<div className="text-foreground">Loading...</div>}>
        <AuthForm />
      </Suspense>
    </div>
  )
}
