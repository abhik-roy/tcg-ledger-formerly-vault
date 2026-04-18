import { getTargets } from "@/app/actions/buylist"
import { TargetsClient } from "@/components/admin/TargetsClient"

export const dynamic = "force-dynamic"

export default async function TargetsPage() {
  const result = await getTargets()
  const holdings = result.success ? result.data : []

  return <TargetsClient holdings={holdings} />
}
