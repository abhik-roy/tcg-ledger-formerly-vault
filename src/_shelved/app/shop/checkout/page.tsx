import { getPublicTaxRate } from "@/app/actions/settings"
import CheckoutClient from "./CheckoutClient"

// Must be dynamic — fetches tax rate from DB at request time (no static prerender)
export const dynamic = "force-dynamic"

export default async function CheckoutPage() {
  const taxRate = await getPublicTaxRate()
  return <CheckoutClient taxRate={taxRate} />
}
