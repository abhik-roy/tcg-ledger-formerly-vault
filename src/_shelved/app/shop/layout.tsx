import { CartProvider } from "@/context/cart-context"
import { Toaster } from "sonner"

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    // The Provider MUST be at this level or higher (e.g. root layout)
    <CartProvider>
      <div className="min-h-screen bg-background">
        {/* Your Shop Header/Nav likely goes here */}
        {children}
        <Toaster position="bottom-right" richColors closeButton />
      </div>
    </CartProvider>
  )
}
