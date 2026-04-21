"use client"

import { useState, Suspense } from "react"
import dynamic from "next/dynamic"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertCircle, Eye, EyeOff, CheckCircle2, ArrowRight } from "lucide-react"
import { registerUser } from "@/app/actions/register"
import { Eyebrow } from "@/components/ui/graphite"

// WebGL card — client-only, avoids SSR hydration mismatch.
const RotatingCard = dynamic(
  () => import("@/components/login/RotatingCard").then((m) => m.RotatingCard),
  { ssr: false, loading: () => null }
)

// ── Sub-components ────────────────────────────────────────────

const BLACK_LOTUS_PNG =
  "https://cards.scryfall.io/png/front/b/0/b0faa7f2-b547-42c4-a810-839da50dadfe.png?1559591477"

const MTG_CARD_BACK =
  "https://backs.scryfall.io/normal/0/a/0aeebaf5-8c7d-4636-9e82-8c27447861f7.jpg"

function SpinnerDots() {
  return (
    <span className="inline-flex gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--bg)",
            animation: `pulse-dot 1.2s ease-in-out ${i * 0.15}s infinite`,
            opacity: 0.85,
          }}
        />
      ))}
    </span>
  )
}

// ── Main form ─────────────────────────────────────────────────

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/admin"

  const [mode, setMode] = useState<"login" | "register">("login")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [nameFocused, setNameFocused] = useState(false)

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
    <div
      className="fixed inset-0 overflow-hidden lg:grid"
      style={{
        background: "var(--bg)",
        gridTemplateColumns: "1.15fr 1fr",
        color: "var(--ink)",
      }}
    >
      {/* LEFT: ambient stage */}
      <aside
        className="relative overflow-hidden hidden lg:block"
        style={{ background: "var(--bg-sunk)", borderRight: "1px solid var(--rule)" }}
      >
        <div className="aurora" />

        {/* Wordmark only (meta label removed) */}
        <div className="absolute top-8 left-10 right-10 z-[2]">
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 800,
              fontSize: 24,
              letterSpacing: "-0.035em",
              lineHeight: 1,
              color: "var(--ink)",
            }}
          >
            TCGLedger<span style={{ color: "var(--accent-hot)" }}>.</span>
          </span>
        </div>

        {/* 3D rotating card — WebGL via React Three Fiber */}
        <div className="absolute inset-0 grid place-items-center z-[1]">
          <div className="anim-card-lift" style={{ width: 520, height: 600 }}>
            <RotatingCard frontUrl={BLACK_LOTUS_PNG} backUrl={MTG_CARD_BACK} speed={0.35} />
          </div>
        </div>

        {/* Tagline */}
        <div className="absolute bottom-10 left-10 right-10 z-[2] anim-slide">
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 800,
              fontSize: "clamp(22px, 2vw, 32px)",
              lineHeight: 1.15,
              letterSpacing: "-0.025em",
              maxWidth: 520,
              color: "var(--ink)",
            }}
          >
            A self-hosted collection management and trading system.
          </div>
        </div>
      </aside>

      {/* RIGHT: form */}
      <div className="flex flex-col px-14 py-12 relative overflow-y-auto">
        <div className="flex-1 flex flex-col justify-center max-w-[440px] anim-fade">
          <h1
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "clamp(44px, 5.2vw, 72px)",
              fontWeight: 800,
              letterSpacing: "-0.035em",
              lineHeight: 0.95,
              margin: "0 0 18px 0",
              color: "var(--ink)",
            }}
          >
            {mode === "login" ? "This is TCGLedger" : "Join TCGLedger"}
          </h1>

          <p
            className="mb-8 max-w-[380px]"
            style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.55 }}
          >
            {mode === "login"
              ? "Sign in to see what's new in the binder, review offers on your cards, and settle open trades."
              : "Create an account to list cards in the binder, make offers on other members' cards, and keep a full trade ledger."}
          </p>

          <form
            onSubmit={mode === "login" ? handleLogin : handleRegister}
            className="flex flex-col gap-4"
          >
            {/* Error banner */}
            {error && (
              <div
                className="px-3 py-2.5 rounded-[var(--radius-sm)] flex items-center gap-2"
                style={{
                  background: "color-mix(in srgb, var(--accent-hot) 8%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--accent-hot) 30%, transparent)",
                  color: "var(--accent-hot)",
                  fontSize: 13,
                }}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Success banner */}
            {success && (
              <div
                className="px-3 py-2.5 rounded-[var(--radius-sm)] flex items-center gap-2"
                style={{
                  background: "color-mix(in srgb, var(--signal-green) 8%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--signal-green) 30%, transparent)",
                  color: "var(--signal-green)",
                  fontSize: 13,
                }}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {success}
              </div>
            )}

            {/* Display name (register only) */}
            {mode === "register" && (
              <div>
                <div className="mb-2">
                  <Eyebrow>Display Name</Eyebrow>
                </div>
                <div
                  className="relative rounded-[var(--radius)] transition-shadow"
                  style={{
                    border: `1px solid var(${nameFocused ? "--ink" : "--rule-strong"})`,
                    background: "var(--surface)",
                    boxShadow: nameFocused
                      ? "0 0 0 4px color-mix(in srgb, var(--ink) 8%, transparent)"
                      : "none",
                  }}
                >
                  <input
                    type="text"
                    required
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    onFocus={() => setNameFocused(true)}
                    onBlur={() => setNameFocused(false)}
                    className="w-full h-[46px] px-3.5 bg-transparent outline-none"
                    style={{ fontSize: 15, color: "var(--ink)" }}
                    placeholder="How your friends will see you"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <div className="mb-2">
                <Eyebrow>Email</Eyebrow>
              </div>
              <div
                className="relative rounded-[var(--radius)] transition-shadow"
                style={{
                  border: `1px solid var(${emailFocused ? "--ink" : "--rule-strong"})`,
                  background: "var(--surface)",
                  boxShadow: emailFocused
                    ? "0 0 0 4px color-mix(in srgb, var(--ink) 8%, transparent)"
                    : "none",
                }}
              >
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  className="w-full h-[46px] px-3.5 bg-transparent outline-none"
                  style={{ fontSize: 15, color: "var(--ink)" }}
                  placeholder="you@tailnet.local"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="mb-2">
                <Eyebrow>Password</Eyebrow>
              </div>
              <div
                className="relative rounded-[var(--radius)] transition-shadow"
                style={{
                  border: `1px solid var(${passwordFocused ? "--ink" : "--rule-strong"})`,
                  background: "var(--surface)",
                  boxShadow: passwordFocused
                    ? "0 0 0 4px color-mix(in srgb, var(--ink) 8%, transparent)"
                    : "none",
                }}
              >
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={mode === "register" ? 6 : undefined}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  className="w-full h-[46px] px-3.5 pr-12 bg-transparent outline-none"
                  style={{ fontSize: 15, color: "var(--ink)" }}
                  placeholder={mode === "register" ? "Min 6 characters" : "Enter your password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-md transition-colors"
                  style={{ color: "var(--ink-3)" }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-[52px] rounded-[var(--radius)] flex items-center justify-center gap-2.5 cursor-pointer transition-all disabled:cursor-wait"
              style={{
                background: "var(--ink)",
                color: "var(--bg)",
                border: "1px solid var(--ink)",
                fontSize: 14,
                fontWeight: 500,
                letterSpacing: "-0.005em",
              }}
            >
              {loading ? (
                <>
                  <SpinnerDots />
                  <span>{mode === "login" ? "Signing in…" : "Creating account…"}</span>
                </>
              ) : (
                <>
                  {mode === "login" ? "Sign in" : "Create account"}
                  <ArrowRight className="w-4 h-4" strokeWidth={2} />
                </>
              )}
            </button>
          </form>

          {/* Mode toggle */}
          <div
            className="mt-5 pt-4 flex justify-between items-center"
            style={{
              borderTop: "1px solid var(--rule)",
              fontSize: 11.5,
              color: "var(--ink-3)",
            }}
          >
            <span>
              {mode === "login" ? "New here?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={switchMode}
                style={{ color: "var(--ink)", fontWeight: 600 }}
                className="hover:underline"
              >
                {mode === "login" ? "Create an account" : "Sign in"}
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div style={{ color: "var(--ink)" }}>Loading…</div>}>
      <AuthForm />
    </Suspense>
  )
}
