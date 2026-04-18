import { getCustomers, getCustomerStats } from "@/app/actions/customers"
import { CustomersClient } from "@/components/admin/CustomersClient"

export const dynamic = "force-dynamic"

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const { q, page } = await searchParams
  const currentPage = Number(page) || 1
  const query = q || ""

  const [{ data, total, totalPages }, stats] = await Promise.all([
    getCustomers(currentPage, query),
    getCustomerStats(),
  ])

  return (
    <CustomersClient
      initialData={data}
      total={total}
      totalPages={totalPages}
      currentPage={currentPage}
      stats={stats}
    />
  )
}
