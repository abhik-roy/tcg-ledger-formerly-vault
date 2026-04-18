import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import LogoutButton from "@/components/shop/LogoutButton"
import ProfileClient from "@/components/shop/ProfileClient"
import { getMyOrders } from "@/app/actions/profile"

export default async function ProfilePage() {
  const session = await auth()

  if (!session?.user || session.user.role !== "CUSTOMER") {
    redirect("/shop/login?callbackUrl=/shop/profile")
  }

  // Fetch first page of orders server-side for instant render.
  // Next.js serializes Date fields to strings across the RSC boundary automatically.

  const { orders, total, totalPages } = await getMyOrders(1)

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Account</h1>
            <p className="text-muted-foreground mt-1">Manage your orders and account settings</p>
          </div>
          <div className="shrink-0">
            <LogoutButton />
          </div>
        </div>

        <ProfileClient
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          initialOrders={orders as any}
          initialTotal={total}
          initialTotalPages={totalPages}
          customerName={session.user.name}
          customerEmail={session.user.email}
        />
      </div>
    </div>
  )
}
