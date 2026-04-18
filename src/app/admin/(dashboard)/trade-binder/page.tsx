import { getTradeBinder } from "@/app/actions/trade-binder"
import { getHoldings } from "@/app/actions/holding"
import { TradeBinderClient } from "@/components/admin/TradeBinderClient"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function TradeBinderPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/admin/login")

  const [binderResult, holdingsResult] = await Promise.all([
    getTradeBinder(),
    getHoldings({ listedForTrade: true }),
  ])

  const listings = binderResult.success ? binderResult.data : []
  const myHoldings = holdingsResult.success ? holdingsResult.data : []

  return (
    <TradeBinderClient
      listings={listings}
      currentUserId={session.user.id}
      myHoldings={myHoldings}
    />
  )
}
