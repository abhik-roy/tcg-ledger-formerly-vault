import type { CartItem } from "@/context/cart-context"
import { CartItemRow } from "@/components/shop/CartItemRow"

interface OrderItemListProps {
  items: CartItem[]
}

export default function OrderItemList({ items }: OrderItemListProps) {
  return (
    <div className="space-y-5">
      {items.map((item) => (
        <CartItemRow key={item.id} item={item} variant="readonly" />
      ))}
    </div>
  )
}
