import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getMyOffers, getOffersOnMyListings } from "@/app/actions/trade-offer"
import { InboxClient } from "@/components/admin/inbox/InboxClient"

export const dynamic = "force-dynamic"

export default async function InboxPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/admin/login")

  const [inRes, outRes] = await Promise.all([getOffersOnMyListings(), getMyOffers()])
  const incoming = inRes.success ? inRes.data : []
  const outgoing = outRes.success ? outRes.data : []

  return <InboxClient incoming={incoming} outgoing={outgoing} currentUserId={session.user.id} />
}
