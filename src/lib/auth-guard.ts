import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * Requires any authenticated user — use for most actions.
 */
export async function requireUser() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  return session!
}

/**
 * Restricts to ADMIN only — use for team management, global settings, etc.
 */
export async function requireAdmin() {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized")
  return session!
}

/**
 * Verifies that the authenticated user owns the given holding,
 * or is an ADMIN (who can act on any holding).
 */
export async function requireOwnership(holdingId: string, userId: string) {
  const holding = await prisma.holding.findUnique({
    where: { id: holdingId },
    select: { userId: true },
  })
  if (!holding) throw new Error("Holding not found")

  // Check ownership: the holding must belong to the user, OR the caller is ADMIN
  const session = await auth()
  if (holding.userId !== userId && session?.user?.role !== "ADMIN") {
    throw new Error("Unauthorized: you do not own this holding")
  }
}
