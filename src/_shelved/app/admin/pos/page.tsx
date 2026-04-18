import { searchPOSInventory } from "@/app/actions/pos"
import { POSClient } from "@/components/admin/pos/POSClient"

export const dynamic = "force-dynamic"

export default async function POSPage() {
  const initialItems = await searchPOSInventory("")
  return <POSClient initialItems={initialItems} />
}
