// scripts/import-cards.ts
// Usage: npx tsx scripts/import-cards.ts --user <email> --file <path.csv>
// CSV columns: name,set,collectorNumber,finish,game,condition,quantity,notes

import { prisma, parseArgs } from "./_lib"
import { readFile } from "node:fs/promises"
import Papa from "papaparse"

type Row = {
  name: string
  set: string
  collectorNumber: string
  finish: string
  game: string
  condition: string
  quantity: string
  notes?: string
}

async function main() {
  const args = parseArgs()
  if (!args.user || !args.file) {
    console.error("Usage: --user <email> --file <path.csv>")
    process.exit(1)
  }

  const user = await prisma.user.findUnique({ where: { email: args.user.toLowerCase() } })
  if (!user) {
    console.error(`ERROR: No user with email ${args.user}`)
    process.exit(1)
  }

  const csvText = await readFile(args.file, "utf-8")
  const parsed = Papa.parse<Row>(csvText, { header: true, skipEmptyLines: true })
  const rows = parsed.data

  let imported = 0
  const failed: Array<{ row: Row; reason: string }> = []

  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      try {
        const card = await tx.card.upsert({
          where: {
            printing_key: {
              name: row.name,
              set: row.set,
              collectorNumber: row.collectorNumber,
              finish: row.finish,
            },
          },
          create: {
            name: row.name,
            set: row.set,
            setName: row.set,
            collectorNumber: row.collectorNumber,
            finish: row.finish,
            game: row.game,
            rarity: "unknown",
          },
          update: {},
        })

        const quantityInt = parseInt(row.quantity, 10) || 1
        const existing = await tx.holding.findUnique({
          where: {
            user_printing_condition: {
              userId: user.id,
              cardId: card.id,
              condition: row.condition || "NM",
            },
          },
        })

        if (existing) {
          await tx.holding.update({
            where: { id: existing.id },
            data: { quantity: existing.quantity + quantityInt },
          })
        } else {
          await tx.holding.create({
            data: {
              userId: user.id,
              cardId: card.id,
              condition: row.condition || "NM",
              quantity: quantityInt,
              notes: row.notes || null,
            },
          })
        }

        await tx.quantityLog.create({
          data: {
            userId: user.id,
            cardName: row.name,
            cardSet: row.set,
            finish: row.finish,
            delta: quantityInt,
            reason: "import",
            actorId: user.id,
            time: new Date(),
            user: user.id,
          },
        })

        imported++
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error"
        failed.push({ row, reason: message })
      }
    }
  })

  console.log(`${imported} cards imported, ${failed.length} failed`)
  if (failed.length > 0) {
    console.log("Failed rows:")
    for (const f of failed) console.log(`  ${f.row.name} (${f.row.set}): ${f.reason}`)
  }
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
