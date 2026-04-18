import { requireUser } from "@/lib/auth-guard"
import { getStoreSettings } from "@/app/actions/settings"
import { SettingsClient } from "@/components/admin/settings/SettingsClient"

export const dynamic = "force-dynamic"

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>
}) {
  const session = await requireUser()
  const userRole = session.user.role ?? "USER"
  const { section } = await searchParams

  const settingsResult = userRole === "ADMIN" ? await getStoreSettings() : null
  const settings = settingsResult && settingsResult.success ? settingsResult.data : null

  return <SettingsClient settings={settings} userRole={userRole} initialSection={section} />
}
