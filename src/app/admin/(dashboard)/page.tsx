import { Suspense } from "react"
import { getPersonalStats, getTailnetStats } from "@/app/actions/dashboard"
import { Library, Users, Repeat2, TrendingUp, Layers, DollarSign, Hash } from "lucide-react"
import Link from "next/link"

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="h-14 border-b border-border flex items-center gap-3 px-4 sm:px-6 shrink-0">
        <h1 className="text-base font-semibold text-foreground">Dashboard</h1>
        <span className="text-xs text-muted-foreground hidden sm:inline">Collection overview</span>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  )
}

function getGameAccentClass(game: string): string {
  const g = game.toLowerCase()
  if (g.includes("magic")) return "game-accent-magic"
  if (g.includes("pokemon") || g.includes("pokémon")) return "game-accent-pokemon"
  if (g.includes("yu-gi-oh") || g.includes("yugioh")) return "game-accent-yugioh"
  if (g.includes("lorcana")) return "game-accent-lorcana"
  return "game-accent-default"
}

async function DashboardContent() {
  const [personalResult, tailnetResult] = await Promise.all([getPersonalStats(), getTailnetStats()])

  const personal = personalResult.success ? personalResult.data : null
  const tailnet = tailnetResult.success ? tailnetResult.data : null

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Stat cards — 2x2 grid */}
      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Cards */}
          <div className="bg-card border border-border rounded-xl p-4 sm:p-5 card-glow">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Layers className="w-4 h-4 text-primary" />
              </div>
            </div>
            <p className="stat-value">{(personal?.totalCards ?? 0).toLocaleString()}</p>
            <p className="stat-label mt-1">Total Cards</p>
          </div>

          {/* Unique Printings */}
          <div className="bg-card border border-border rounded-xl p-4 sm:p-5 card-glow">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center">
                <Hash className="w-4 h-4 text-info" />
              </div>
            </div>
            <p className="stat-value">{(personal?.uniquePrintings ?? 0).toLocaleString()}</p>
            <p className="stat-label mt-1">Unique Printings</p>
          </div>

          {/* Collection Value */}
          <div className="bg-card border border-border rounded-xl p-4 sm:p-5 card-glow">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-success" />
              </div>
            </div>
            <p className="stat-value text-success">
              $
              {((personal?.totalValueCents ?? 0) / 100).toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </p>
            <p className="stat-label mt-1">Collection Value</p>
          </div>

          {/* Tailnet Users */}
          <div className="bg-card border border-border rounded-xl p-4 sm:p-5 card-glow">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-primary" />
              </div>
            </div>
            <p className="stat-value text-primary">{tailnet?.totalUsers ?? 0}</p>
            <p className="stat-label mt-1">Tailnet Users</p>
          </div>
        </div>
      </div>

      {/* Panel grid */}
      <div className="px-4 sm:px-5 pb-5 space-y-4 sm:space-y-5">
        {/* Row 1: Top Games + Recently Acquired */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          {/* Top Games */}
          <div className="bg-card border border-border rounded-xl flex flex-col overflow-hidden card-glow">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
              <div>
                <p className="text-base font-semibold text-foreground">Top Games</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  By card count in your collection
                </p>
              </div>
            </div>
            <div className="divide-y divide-border">
              {personal?.topGames && personal.topGames.length > 0 ? (
                personal.topGames.map((game, idx) => (
                  <div
                    key={idx}
                    className={`px-5 py-3 flex items-center gap-4 hover:bg-muted/20 transition-colors ${getGameAccentClass(game.game)}`}
                  >
                    <span className="text-sm font-black text-muted-foreground/30 w-5 shrink-0 text-center">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{game.game}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-foreground">{game.count} cards</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-14 text-center px-4">
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                    <Library className="w-7 h-7 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No cards yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add some cards to see your collection breakdown.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recently Acquired */}
          <div className="bg-card border border-border rounded-xl flex flex-col overflow-hidden card-glow">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
              <p className="text-base font-semibold text-foreground">Recently Acquired</p>
              <Link
                href="/admin/collection"
                className="text-xs text-primary font-medium hover:underline min-h-[44px] flex items-center"
              >
                View all
              </Link>
            </div>
            <div className="divide-y divide-border">
              {personal?.recentlyAcquired && personal.recentlyAcquired.length > 0 ? (
                personal.recentlyAcquired.map((holding) => (
                  <div
                    key={holding.id}
                    className="px-5 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {holding.card.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {holding.card.setName} · {holding.condition} · x{holding.quantity}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      {holding.card.marketPrice != null && (
                        <span className="text-sm font-bold text-foreground tabular-nums font-mono">
                          ${(holding.card.marketPrice / 100).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-14 text-center px-4">
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                    <Library className="w-7 h-7 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Nothing here yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your recent acquisitions will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Trending Cards + Recent Listings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          {/* Trending Cards */}
          <div className="bg-card border border-border rounded-xl flex flex-col overflow-hidden card-glow">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
              <p className="text-base font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Trending Cards (Tailnet)
              </p>
            </div>
            <div className="divide-y divide-border">
              {tailnet?.trendingCards && tailnet.trendingCards.length > 0 ? (
                tailnet.trendingCards.map((tc, idx) => (
                  <div
                    key={idx}
                    className="px-5 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{tc.card.name}</p>
                      <p className="text-xs text-muted-foreground">{tc.card.setName}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-bold text-foreground">{tc.ownerCount} owners</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-14 text-center px-4">
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                    <TrendingUp className="w-7 h-7 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No trending data</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Popular cards across the Tailnet will show up here.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Listings */}
          <div className="bg-card border border-border rounded-xl flex flex-col overflow-hidden card-glow">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
              <p className="text-base font-semibold text-foreground flex items-center gap-2">
                <Repeat2 className="w-4 h-4 text-primary" />
                Recent Trade Listings
              </p>
              <Link
                href="/admin/trade-binder"
                className="text-xs text-primary font-medium hover:underline min-h-[44px] flex items-center"
              >
                View all
              </Link>
            </div>
            <div className="divide-y divide-border">
              {tailnet?.recentListings && tailnet.recentListings.length > 0 ? (
                tailnet.recentListings.map((listing) => (
                  <div
                    key={listing.holdingId}
                    className="px-5 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {listing.card.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {listing.owner.displayName || listing.owner.email} · {listing.condition}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm text-foreground">x{listing.quantity}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-14 text-center px-4">
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                    <Repeat2 className="w-7 h-7 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No trade listings</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    List cards for trade to see them here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto animate-pulse">
      {/* Stat cards skeleton */}
      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 h-28" />
          ))}
        </div>
      </div>
      {/* Panel skeletons */}
      <div className="px-4 sm:px-5 pb-5 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-muted h-72 rounded-xl" />
          <div className="bg-muted h-72 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-muted h-64 rounded-xl" />
          <div className="bg-muted h-64 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
