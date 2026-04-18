import { getHoldings } from "@/app/actions/holding"
import { CollectionClient } from "@/components/admin/CollectionClient"

export const dynamic = "force-dynamic"

export default async function CollectionPage() {
  const result = await getHoldings()
  const holdings = result.success ? result.data : []

  return <CollectionClient holdings={holdings} />
}
