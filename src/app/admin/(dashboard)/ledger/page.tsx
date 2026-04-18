import { getLedgerEntries } from "@/app/actions/holding"
import { LedgerTable } from "@/components/admin/LedgerTable"

export const dynamic = "force-dynamic"

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>
}) {
  const { start, end } = await searchParams

  const entries = await getLedgerEntries({
    startDate: start,
    endDate: end,
  })

  const endDate = end || new Date().toISOString()
  const startDate =
    start || new Date(new Date(endDate).getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <LedgerTable data={entries || []} dateRange={{ start: startDate, end: endDate }} />
    </div>
  )
}
