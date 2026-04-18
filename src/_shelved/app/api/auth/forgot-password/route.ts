import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"
import { EmailService } from "@/services/email.service"

// ---------------------------------------------------------------------------
// IP-based rate limiting — in-memory (3 attempts per 15 minutes per IP)
// ---------------------------------------------------------------------------
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 3

const rateLimitMap = new Map<string, { count: number; firstAttempt: number }>()
let lastCleanup = Date.now()

function cleanupExpiredEntries(): void {
  const now = Date.now()
  if (now - lastCleanup < RATE_LIMIT_WINDOW_MS) return
  lastCleanup = now
  for (const [key, entry] of rateLimitMap) {
    if (now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) rateLimitMap.delete(key)
  }
}

function isRateLimited(ip: string): boolean {
  cleanupExpiredEntries()
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, firstAttempt: now })
    return false
  }
  entry.count += 1
  return entry.count > MAX_ATTEMPTS
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: Request) {
  try {
    const headersList = await headers()
    const forwarded = headersList.get("x-forwarded-for")
    const ip = forwarded?.split(",")[0]?.trim() || headersList.get("x-real-ip") || "unknown"

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { message: "Too many requests. Please try again later." },
        { status: 429 }
      )
    }

    const body = await req.json()
    const email: string = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { message: "Please provide a valid email address." },
        { status: 400 }
      )
    }

    // Always return the same response to prevent email enumeration
    const GENERIC_RESPONSE = {
      message: "If an account with that email exists, we've sent password reset instructions.",
    }

    const customer = await prisma.customer.findUnique({ where: { email } })
    if (customer) {
      const rawToken = crypto.randomBytes(32).toString("hex")
      const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex")
      const expiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      await prisma.customer.update({
        where: { email },
        data: { passwordResetToken: hashedToken, passwordResetExpiry: expiry },
      })

      // Fire-and-forget — send raw token in email (only hashed version stored)
      EmailService.sendPasswordResetEmail(email, rawToken).catch((err) =>
        console.error("Password reset email failed:", err)
      )
    }

    return NextResponse.json(GENERIC_RESPONSE, { status: 200 })
  } catch (error) {
    console.error("FORGOT_PASSWORD_ERROR", error)
    return NextResponse.json(
      { message: "An unexpected error occurred. Please try again." },
      { status: 500 }
    )
  }
}
