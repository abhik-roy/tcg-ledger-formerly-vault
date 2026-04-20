"use client"

import { useState, Suspense } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertCircle, Eye, EyeOff, CheckCircle2, ArrowRight } from "lucide-react"
import { registerUser } from "@/app/actions/register"
import { Eyebrow } from "@/components/ui/graphite"

// ── Sub-components ────────────────────────────────────────────

function FanCard({
  offset,
  hue,
  delay,
  primary,
}: {
  offset: number
  hue: number
  delay: number
  primary?: boolean
}) {
  const deg = offset * 8
  const x = offset * 44
  const y = Math.abs(offset) * 14
  const titles = [
    "Blacklotus",
    "Pikachu · Illustrator",
    "Dark Magician",
    "Ursula Holo",
    "Serra Angel",
  ]
  const codes = ["LEA · 001", "PRO · P05", "LOB · 000", "ROF · 188", "2ED · 021"]
  const idx = Math.abs(offset) % 5
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: 220,
        height: 308,
        marginLeft: -110,
        marginTop: -154,
        transform: `translate(${x}px, ${y}px) rotateZ(${deg}deg) rotateY(${offset * -2}deg)`,
        transformOrigin: "center 85%",
        zIndex: primary ? 10 : 5 - Math.abs(offset),
        borderRadius: 14,
        background: `linear-gradient(145deg, hsl(${hue}, 18%, 14%) 0%, hsl(${hue}, 22%, 8%) 100%)`,
        boxShadow: primary
          ? "0 30px 60px -20px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.08), inset 0 1px 0 rgba(255,255,255,.1)"
          : "0 12px 24px -8px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.04)",
        animation: `card-lift .8s cubic-bezier(.15,.85,.25,1.05) both ${delay}s, fan-float 8s ease-in-out infinite alternate ${delay}s`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 10,
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,.1)",
          background: `radial-gradient(ellipse at 30% 20%, hsla(${hue}, 70%, 60%, .45) 0%, transparent 55%), radial-gradient(ellipse at 80% 85%, hsla(${hue}, 60%, 40%, .35) 0%, transparent 55%)`,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "8px 12px",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            fontWeight: 600,
            color: "rgba(255,255,255,.9)",
            letterSpacing: "-0.01em",
            borderBottom: "1px solid rgba(255,255,255,.12)",
            background: `linear-gradient(180deg, hsla(${hue}, 70%, 50%, .3), transparent)`,
          }}
        >
          {titles[idx]}
        </div>
        <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
          <svg
            width="70"
            height="70"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,255,255,.85)"
            strokeWidth="1"
            opacity="0.9"
          >
            <path d="M12 2 L4 8 L4 16 L12 22 L20 16 L20 8 Z" />
          </svg>
        </div>
        <div
          style={{
            padding: "6px 12px",
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.1em",
            color: "rgba(255,255,255,.55)",
            textTransform: "uppercase",
            borderTop: "1px solid rgba(255,255,255,.08)",
          }}
        >
          {codes[idx]}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(110deg, transparent 40%, rgba(255,255,255,.13) 50%, transparent 60%)",
          mixBlendMode: "screen",
        }}
      />
    </div>
  )
}

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

        {/* Wordmark + meta */}
        <div className="absolute top-8 left-10 right-10 z-[2] flex justify-between items-baseline">
          <span
            className="serif"
            style={{ fontSize: 28, letterSpacing: "-0.025em", lineHeight: 0.9 }}
          >
            Binder<span style={{ color: "var(--accent-hot)", fontStyle: "italic" }}>.</span>
          </span>
          <span
            className="font-mono uppercase"
            style={{ fontSize: 10, letterSpacing: "0.2em", color: "var(--ink-3)" }}
          >
            Edition 12 · Winter
          </span>
        </div>

        {/* Card cascade */}
        <div
          className="absolute inset-0 grid place-items-center z-[1]"
          style={{ perspective: 1400 }}
        >
          <div className="relative anim-card-lift" style={{ width: 440, height: 460 }}>
            <FanCard offset={-2} hue={220} delay={0.0} />
            <FanCard offset={-1} hue={12} delay={0.08} />
            <FanCard offset={0} hue={280} delay={0.16} primary />
            <FanCard offset={1} hue={160} delay={0.24} />
            <FanCard offset={2} hue={45} delay={0.32} />
          </div>
        </div>

        {/* Tagline */}
        <div className="absolute bottom-10 left-10 right-10 z-[2] anim-slide flex items-end gap-6">
          <div className="flex-1">
            <Eyebrow className="mb-2.5">Self-hosted · Tailnet trading</Eyebrow>
            <div
              className="serif"
              style={{
                fontSize: "clamp(30px, 3vw, 44px)",
                lineHeight: 1.05,
                letterSpacing: "-0.025em",
                maxWidth: 460,
              }}
            >
              Every card has a{" "}
              <span className="serif-italic" style={{ color: "var(--accent-hot)" }}>
                story
              </span>
              .<br />
              The ledger remembers it.
            </div>
          </div>
        </div>
      </aside>

      {/* RIGHT: form */}
      <div className="flex flex-col px-14 py-12 relative overflow-y-auto">
        {/* Top meta */}
        <div className="flex justify-end anim-fade">
          <div
            className="font-mono uppercase flex items-center gap-2"
            style={{
              fontSize: 10,
              letterSpacing: "0.16em",
              color: "var(--ink-3)",
            }}
          >
            <span className="live-dot" />
            Ledger · synced now
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-[440px] anim-fade">
          <div className="mb-4">
            <Eyebrow>Sign in · No. 01</Eyebrow>
          </div>

          <h1
            className="serif"
            style={{
              fontSize: "clamp(40px, 4.2vw, 60px)",
              fontWeight: 400,
              letterSpacing: "-0.03em",
              lineHeight: 0.95,
              margin: "0 0 16px 0",
            }}
          >
            {mode === "login" ? (
              <>
                Welcome
                <br />
                <span className="serif-italic flow-text">back to the binder.</span>
              </>
            ) : (
              <>
                Pull up a
                <br />
                <span className="serif-italic flow-text">new binder.</span>
              </>
            )}
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
                  <span>{mode === "login" ? "Opening the binder…" : "Creating account…"}</span>
                </>
              ) : (
                <>
                  {mode === "login" ? "Enter the binder" : "Create account"}
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

        {/* Footer */}
        <div
          className="flex justify-between items-center font-mono uppercase"
          style={{ fontSize: 10.5, color: "var(--ink-3)", letterSpacing: "0.08em" }}
        >
          <span>Self-hosted on your Tailnet</span>
          <span>Escrowed · Insured · Audited</span>
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
