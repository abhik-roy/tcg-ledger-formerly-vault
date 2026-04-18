// scripts/_lib.ts — Shared helpers for CLI bootstrap scripts.

import { PrismaClient } from "@prisma/client"
import { createInterface } from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"
import bcrypt from "bcryptjs"

export const prisma = new PrismaClient()

export async function prompt(question: string): Promise<string> {
  const rl = createInterface({ input, output })
  try {
    return (await rl.question(question)).trim()
  } finally {
    rl.close()
  }
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10)
}

export function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {}
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2)
      const next = argv[i + 1]
      if (next && !next.startsWith("--")) {
        args[key] = next
        i++
      } else {
        args[key] = "true"
      }
    }
  }
  return args
}
