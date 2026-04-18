import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getTeamMembers } from "@/app/actions/team"
import { TeamClient } from "@/components/admin/users/TeamClient"

export const dynamic = "force-dynamic"

export default async function UsersPage() {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") redirect("/admin")

  const members = await getTeamMembers()
  return <TeamClient members={members} currentUserId={session.user.id || ""} />
}
