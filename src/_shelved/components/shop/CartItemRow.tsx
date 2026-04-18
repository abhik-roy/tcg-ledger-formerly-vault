import Image from "next/image"
import { Trash2, Plus, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatPrice } from "@/lib/format"

interface CartItemRowProps {
  item: {
    id: number
    name?: string
    cardName?: string
    setname?: string
    setName?: string
    condition?: string
    finish?: string
    storeprice?: number
    price?: number
    cartQuantity: number
    image?: string | null
  }
  variant: "compact" | "expanded" | "readonly"
  onQuantityChange?: (id: number, delta: number) => void
  onRemove?: (id: number) => void
}

function resolveFields(item: CartItemRowProps["item"]) {
  return {
    name: item.name ?? item.cardName ?? "Unnamed",
    setName: item.setName ?? item.setname ?? "",
    price: item.price ?? item.storeprice ?? 0,
  }
}

export function CartItemRow({ item, variant, onQuantityChange, onRemove }: CartItemRowProps) {
  const { name, setName, price } = resolveFields(item)

  if (variant === "compact") {
    return (
      <div className="flex gap-4 w-full">
        {/* Image */}
        <div className="relative h-20 w-16 bg-muted/50 rounded-md border border-border shrink-0 overflow-hidden">
          {item.image ? (
            <Image src={item.image} alt={name} fill className="object-cover" unoptimized />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground/40">
              No Img
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex justify-between items-start gap-2">
              <h4 className="text-sm font-semibold line-clamp-2 leading-tight">{name}</h4>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground/40 hover:text-destructive"
                onClick={() => onRemove?.(item.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
              {setName}
              {item.condition && <> &middot; {item.condition}</>}
              {item.finish && <> &middot; {item.finish}</>}
            </p>
          </div>

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-0 border border-border rounded-md h-7">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-none rounded-l-md"
                onClick={() => onQuantityChange?.(item.id, -1)}
              >
                <Minus className="w-3 h-3 text-foreground/70" />
              </Button>
              <span className="text-xs font-medium w-6 text-center">{item.cartQuantity}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-none rounded-r-md"
                onClick={() => onQuantityChange?.(item.id, 1)}
              >
                <Plus className="w-3 h-3 text-foreground/70" />
              </Button>
            </div>
            <span className="text-sm font-bold">{formatPrice(price * item.cartQuantity)}</span>
          </div>
        </div>
      </div>
    )
  }

  if (variant === "expanded") {
    return (
      <div className="flex gap-4 p-4">
        {/* Image */}
        <div className="relative w-24 h-24 bg-muted/50 rounded-md flex-shrink-0 overflow-hidden">
          {item.image ? (
            <Image src={item.image} alt={name} fill className="object-cover" unoptimized />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground/40">
              No Img
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 flex flex-col justify-between min-w-0">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold">{name}</h3>
              <p className="text-sm text-muted-foreground">
                {setName}
                {item.condition && <> &middot; {item.condition}</>}
                {item.finish && <> &middot; {item.finish}</>}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">{formatPrice(price)} ea.</p>
              <p className="font-bold">{formatPrice(price * item.cartQuantity)}</p>
            </div>
          </div>

          <div className="flex justify-between items-end mt-4">
            {/* Quantity Controls */}
            <div className="flex items-center gap-0 bg-muted/60 rounded-lg p-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onQuantityChange?.(item.id, -1)}
              >
                <Minus className="w-3 h-3" />
              </Button>
              <span className="text-sm font-medium w-6 text-center">{item.cartQuantity}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onQuantityChange?.(item.id, 1)}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>

            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onRemove?.(item.id)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remove
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // readonly variant
  return (
    <div className="flex gap-4 items-center">
      <div className="relative w-14 h-[72px] bg-card rounded-lg border border-border p-1 shrink-0 shadow-sm">
        <div className="relative w-full h-full rounded overflow-hidden bg-muted">
          {item.image ? (
            <Image src={item.image} alt={name} fill className="object-cover" unoptimized />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[8px] text-muted-foreground/40 uppercase font-bold">
              No Image
            </div>
          )}
        </div>
        <span className="absolute -top-2 -right-2 w-5 h-5 bg-foreground text-background text-caption font-bold rounded-full flex items-center justify-center border-2 border-card">
          {item.cartQuantity}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-tight truncate">{name}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
          {setName}
          {item.condition && <> &middot; {item.condition}</>}
        </p>
      </div>
      <p className="text-sm font-bold text-foreground shrink-0">
        {formatPrice(price * item.cartQuantity)}
      </p>
    </div>
  )
}
