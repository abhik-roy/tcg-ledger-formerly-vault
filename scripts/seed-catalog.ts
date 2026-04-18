// scripts/seed-catalog.ts
// Bulk-populates the Card catalog from Scryfall (Magic) and Pokemon TCG API.
//
// Usage:
//   npx tsx scripts/seed-catalog.ts                  # both games
//   npx tsx scripts/seed-catalog.ts --magic-only     # Magic only
//   npx tsx scripts/seed-catalog.ts --pokemon-only   # Pokemon only
//
// Scryfall bulk data is ~80MB JSON. Pokemon TCG API is paginated (~18K cards).
// Cards are upserted by printing_key (name, set, collectorNumber, finish).
// Existing cards are updated with fresh images/prices; new cards are created.
// This is safe to re-run — idempotent via upsert.

import { prisma, parseArgs } from "./_lib"

const SCRYFALL_BULK_URL = "https://api.scryfall.com/bulk-data"
const POKEMON_API_BASE = "https://api.pokemontcg.io/v2/cards"

// ---------------------------------------------------------------------------
// Scryfall (Magic)
// ---------------------------------------------------------------------------

interface ScryfallCard {
  id: string
  name: string
  set: string
  set_name: string
  collector_number: string
  rarity: string
  image_uris?: { small?: string; normal?: string }
  card_faces?: Array<{ image_uris?: { small?: string; normal?: string } }>
  finishes?: string[]
  prices?: { usd?: string | null; usd_foil?: string | null; usd_etched?: string | null }
  tcgplayer_id?: number
  lang?: string
  digital?: boolean
  layout?: string
}

function getImageUris(card: ScryfallCard): { small: string | null; normal: string | null } {
  if (card.image_uris) {
    return { small: card.image_uris.small ?? null, normal: card.image_uris.normal ?? null }
  }
  if (card.card_faces?.[0]?.image_uris) {
    return {
      small: card.card_faces[0].image_uris.small ?? null,
      normal: card.card_faces[0].image_uris.normal ?? null,
    }
  }
  return { small: null, normal: null }
}

function getPriceCents(card: ScryfallCard, finish: string): number | null {
  if (!card.prices) return null
  const raw =
    finish === "foil"
      ? card.prices.usd_foil
      : finish === "etched"
        ? card.prices.usd_etched
        : card.prices.usd
  if (!raw) return null
  const cents = Math.round(parseFloat(raw) * 100)
  return isNaN(cents) ? null : cents
}

async function seedMagic() {
  console.log("==> Fetching Scryfall bulk data manifest...")
  const manifestRes = await fetch(SCRYFALL_BULK_URL)
  const manifest = (await manifestRes.json()) as {
    data: Array<{ type: string; download_uri: string }>
  }
  const defaultCards = manifest.data.find((d) => d.type === "default_cards")
  if (!defaultCards) {
    console.error("ERROR: Could not find default_cards in Scryfall bulk manifest")
    process.exit(1)
  }

  console.log(`==> Downloading bulk data from ${defaultCards.download_uri}...`)
  console.log("    (This is ~80MB, may take a minute...)")
  const bulkRes = await fetch(defaultCards.download_uri)
  const cards = (await bulkRes.json()) as ScryfallCard[]
  console.log(`==> Downloaded ${cards.length.toLocaleString()} cards`)

  // Filter: English, paper only, skip tokens/emblems
  const eligible = cards.filter(
    (c) =>
      c.lang === "en" &&
      !c.digital &&
      c.layout !== "token" &&
      c.layout !== "emblem" &&
      c.layout !== "art_series"
  )
  console.log(`==> ${eligible.length.toLocaleString()} eligible (English, paper, non-token)`)

  let created = 0
  let updated = 0
  let errors = 0
  const batchSize = 500
  const startTime = Date.now()

  for (let i = 0; i < eligible.length; i += batchSize) {
    const batch = eligible.slice(i, i + batchSize)

    await prisma.$transaction(
      batch.map((card) => {
        const finishes = card.finishes ?? ["nonfoil"]
        // Use first finish for the primary entry
        const finish = finishes[0] || "nonfoil"
        const images = getImageUris(card)
        const price = getPriceCents(card, finish)

        return prisma.card.upsert({
          where: {
            printing_key: {
              name: card.name,
              set: card.set.toUpperCase(),
              collectorNumber: card.collector_number,
              finish,
            },
          },
          create: {
            name: card.name,
            set: card.set.toUpperCase(),
            setName: card.set_name,
            collectorNumber: card.collector_number,
            finish,
            game: "magic",
            rarity: card.rarity,
            imageSmall: images.small,
            imageNormal: images.normal,
            scryfallId: card.id,
            tcgplayerId: card.tcgplayer_id?.toString() ?? null,
            marketPrice: price,
            marketPriceAt: price != null ? new Date() : null,
          },
          update: {
            setName: card.set_name,
            rarity: card.rarity,
            imageSmall: images.small,
            imageNormal: images.normal,
            scryfallId: card.id,
            tcgplayerId: card.tcgplayer_id?.toString() ?? null,
            ...(price != null ? { marketPrice: price, marketPriceAt: new Date() } : {}),
          },
        })
      })
    )

    const progress = Math.min(i + batchSize, eligible.length)
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    process.stdout.write(
      `\r    Magic: ${progress.toLocaleString()} / ${eligible.length.toLocaleString()} (${elapsed}s)`
    )
  }

  // Count results (approximate — upsert doesn't distinguish create vs update easily)
  created = eligible.length
  console.log(
    `\n==> Magic catalog seeded: ${created.toLocaleString()} cards processed, ${errors} errors`
  )
}

// ---------------------------------------------------------------------------
// Pokemon TCG API
// ---------------------------------------------------------------------------

interface PokemonCard {
  id: string
  name: string
  number: string
  rarity?: string
  set: { id: string; name: string }
  images?: { small?: string; large?: string }
  tcgplayer?: { prices?: Record<string, { market?: number }> }
}

interface PokemonApiResponse {
  data: PokemonCard[]
  totalCount: number
  page: number
  pageSize: number
}

async function seedPokemon() {
  console.log("==> Fetching Pokemon TCG cards (paginated)...")

  let page = 1
  const pageSize = 250
  let totalCount = 0
  let processed = 0
  const startTime = Date.now()

  do {
    const url = `${POKEMON_API_BASE}?page=${page}&pageSize=${pageSize}&orderBy=set.releaseDate`
    const res = await fetch(url, {
      headers: { "X-Api-Key": process.env.POKEMON_TCG_API_KEY || "" },
    })

    if (!res.ok) {
      console.error(`\nERROR: Pokemon API returned ${res.status} on page ${page}`)
      if (res.status === 429) {
        console.log("    Rate limited. Waiting 10s...")
        await new Promise((r) => setTimeout(r, 10000))
        continue
      }
      break
    }

    const data = (await res.json()) as PokemonApiResponse
    if (page === 1) {
      totalCount = data.totalCount
      console.log(`==> Total Pokemon cards: ${totalCount.toLocaleString()}`)
    }

    if (data.data.length === 0) break

    await prisma.$transaction(
      data.data.map((card) => {
        const finish = card.rarity?.toLowerCase().includes("holo") ? "holofoil" : "nonfoil"

        // Get market price from tcgplayer data if available
        let priceCents: number | null = null
        if (card.tcgplayer?.prices) {
          const priceTypes = Object.values(card.tcgplayer.prices)
          const market = priceTypes.find((p) => p.market != null)?.market
          if (market) priceCents = Math.round(market * 100)
        }

        return prisma.card.upsert({
          where: {
            printing_key: {
              name: card.name,
              set: card.set.id.toUpperCase(),
              collectorNumber: card.number,
              finish,
            },
          },
          create: {
            name: card.name,
            set: card.set.id.toUpperCase(),
            setName: card.set.name,
            collectorNumber: card.number,
            finish,
            game: "pokemon",
            rarity: card.rarity || "unknown",
            imageSmall: card.images?.small ?? null,
            imageNormal: card.images?.large ?? null,
            tcgplayerId: card.id,
            marketPrice: priceCents,
            marketPriceAt: priceCents != null ? new Date() : null,
          },
          update: {
            setName: card.set.name,
            rarity: card.rarity || "unknown",
            imageSmall: card.images?.small ?? null,
            imageNormal: card.images?.large ?? null,
            ...(priceCents != null ? { marketPrice: priceCents, marketPriceAt: new Date() } : {}),
          },
        })
      })
    )

    processed += data.data.length
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    process.stdout.write(
      `\r    Pokemon: ${processed.toLocaleString()} / ${totalCount.toLocaleString()} (${elapsed}s)`
    )

    page++

    // Respect rate limits — 1 request per second without API key
    if (!process.env.POKEMON_TCG_API_KEY) {
      await new Promise((r) => setTimeout(r, 1100))
    }
  } while (processed < totalCount)

  console.log(`\n==> Pokemon catalog seeded: ${processed.toLocaleString()} cards processed`)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs()
  const magicOnly = args["magic-only"] === "true"
  const pokemonOnly = args["pokemon-only"] === "true"

  console.log("╔══════════════════════════════════════════════╗")
  console.log("║        TCG Ledger — Catalog Seed             ║")
  console.log("╚══════════════════════════════════════════════╝")

  if (!pokemonOnly) await seedMagic()
  if (!magicOnly) await seedPokemon()

  const totalCards = await prisma.card.count()
  console.log(`\n==> Done! Total cards in catalog: ${totalCards.toLocaleString()}`)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
