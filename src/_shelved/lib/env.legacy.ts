/**
 * @file env.legacy.ts
 * @description
 *   Shelved environment variable schemas for Stripe and Vercel Cron.
 *   Preserved as reference for future revival of shop/checkout features.
 *
 *   Originally part of src/lib/env.ts — split during Phase 1 pivot.
 */

import { z } from "zod"

// Stripe payment flow vars
export const stripeSchema = z.object({
  STRIPE_SECRET_KEY: z.string().startsWith("sk_", "STRIPE_SECRET_KEY must start with 'sk_'"),
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .startsWith("whsec_", "STRIPE_WEBHOOK_SECRET must start with 'whsec_'"),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z
    .string()
    .startsWith("pk_", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must start with 'pk_'"),
})

// Vercel Cron stale-order cleanup endpoint
export const cronSchema = z.object({
  CRON_SECRET: z.string().min(16, "CRON_SECRET should be at least 16 chars for security"),
})
