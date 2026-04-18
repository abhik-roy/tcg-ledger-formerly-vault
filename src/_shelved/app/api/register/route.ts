import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { EmailService } from "@/services/email.service"

// ---------------------------------------------------------------------------
// IP-based rate limiting — in-memory store (module-level singleton)
// ---------------------------------------------------------------------------
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const MAX_ATTEMPTS = 5

const rateLimitMap = new Map<string, { count: number; firstAttempt: number }>()
let lastCleanup = Date.now()

/** Remove expired entries to prevent unbounded memory growth. */
function cleanupExpiredEntries(): void {
  const now = Date.now()
  // Only run cleanup at most once per window period
  if (now - lastCleanup < RATE_LIMIT_WINDOW_MS) return
  lastCleanup = now

  for (const [key, entry] of rateLimitMap) {
    if (now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
      rateLimitMap.delete(key)
    }
  }
}

function isRateLimited(ip: string): boolean {
  cleanupExpiredEntries()

  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    // First attempt or window expired — reset
    rateLimitMap.set(ip, { count: 1, firstAttempt: now })
    return false
  }

  entry.count += 1
  if (entry.count > MAX_ATTEMPTS) {
    return true
  }

  return false
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_SPECIAL_REGEX = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/

export async function POST(req: Request) {
  try {
    // --- Rate limiting ------------------------------------------------
    const headersList = await headers()
    const forwarded = headersList.get("x-forwarded-for")
    const ip = forwarded?.split(",")[0]?.trim() || headersList.get("x-real-ip") || "unknown"

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { message: "Too many registration attempts. Please try again later." },
        { status: 429 }
      )
    }

    // --- Parse & type-safe cast ---------------------------------------
    const body = await req.json()
    const email: string = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const password: string = typeof body.password === "string" ? body.password : ""
    const name: string = typeof body.name === "string" ? body.name.trim() : ""

    // --- Required fields check ----------------------------------------
    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required." }, { status: 400 })
    }

    // --- Email validation ---------------------------------------------
    if (email.length > 255 || !EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { message: "Please provide a valid email address." },
        { status: 400 }
      )
    }

    // --- Password validation ------------------------------------------
    if (password.length < 8 || password.length > 128) {
      return NextResponse.json(
        { message: "Password must be between 8 and 128 characters." },
        { status: 400 }
      )
    }

    if (!PASSWORD_SPECIAL_REGEX.test(password)) {
      return NextResponse.json(
        { message: "Password must contain at least one number or special character." },
        { status: 400 }
      )
    }

    // --- Name length check --------------------------------------------
    if (name.length > 100) {
      return NextResponse.json(
        { message: "Name must be 100 characters or fewer." },
        { status: 400 }
      )
    }

    // --- Check if customer already exists -----------------------------
    const existingCustomer = await prisma.customer.findUnique({
      where: { email },
    })

    if (existingCustomer) {
      return NextResponse.json(
        { message: "Registration failed. Please try a different email or try again." },
        { status: 400 }
      )
    }

    // --- Hash the password --------------------------------------------
    const hashedPassword = await bcrypt.hash(password, 10)

    // --- Split name into firstName / lastName -------------------------
    const nameParts = name.split(" ")
    const firstName = nameParts[0] || null
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null

    // --- Create the new customer in the Customer table ----------------
    const customer = await prisma.customer.create({
      data: {
        email,
        firstName,
        lastName,
        password: hashedPassword,
      },
    })

    // Fire-and-forget welcome email — never blocks registration
    EmailService.sendWelcomeEmail({
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
    }).catch((err) => console.error("Welcome email failed:", err))

    return NextResponse.json({
      user: {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
      },
    })
  } catch (error) {
    console.error("REGISTRATION_ERROR", error)
    return NextResponse.json(
      { message: "An unexpected error occurred. Please try again." },
      { status: 500 }
    )
  }
}
