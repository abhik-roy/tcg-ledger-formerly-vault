import { InventoryService } from "@/services/inventory.service"
import { getCards } from "@/app/actions/inventory"
import { ShopClient } from "@/components/shop/ShopClient"

export const dynamic = "force-dynamic"

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    page?: string
    game?: string
    condition?: string
    rarity?: string
    set?: string
    sort?: string
  }>
}) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const query = params.q || ""
  const sort = params.sort || "date-desc"

  const [cardsResult, allSets] = await Promise.all([
    getCards({
      page,
      query,
      filters: {
        game: params.game,
        condition: params.condition,
        rarity: params.rarity,
        set: params.set,
      },
      sort,
    }),
    InventoryService.getAllSets(),
  ])

  return (
    <ShopClient
      initialData={cardsResult.data}
      availableSets={allSets}
      totalPages={cardsResult.totalPages}
      currentPage={page}
      totalItems={cardsResult.total}
      currentSort={sort}
    />
  )
}
