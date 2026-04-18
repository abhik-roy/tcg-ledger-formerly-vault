/**
 * @file env.ts
 * @module lib/env
 * @description
 *   Startup environment variable validation using Zod.
 *   Imported as a side effect in prisma.ts and auth.ts so that
 *   missing required vars fail fast with a clear error message.
 *
 * @security DEV-73
 */

import { z } from "zod"

// These vars are required for the app to boot
const criticalSchema = z
  .object({
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    // NextAuth v5 accepts either AUTH_SECRET or NEXTAUTH_SECRET; both are checked.
    // min(32) enforces a minimum entropy threshold for the signing secret.
    AUTH_SECRET: z.string().min(32).optional(),
    NEXTAUTH_SECRET: z.string().min(32).optional(),
  })
  .refine((env) => !!(env.AUTH_SECRET || env.NEXTAUTH_SECRET), {
    message: "Either AUTH_SECRET or NEXTAUTH_SECRET must be set (min 32 chars)",
  })

// Skip in test environment where vars are provided by mocks
if (process.env.NODE_ENV !== "test") {
  const critical = criticalSchema.safeParse(process.env)
  if (!critical.success) {
    console.error(
      "❌ Missing or invalid environment variables:",
      critical.error.flatten().fieldErrors
    )
    throw new Error("Invalid environment configuration — check server logs for details.")
  }
}
