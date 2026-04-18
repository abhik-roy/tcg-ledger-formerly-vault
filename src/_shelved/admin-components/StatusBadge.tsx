import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: string
  type: "condition" | "finish"
}

export function StatusBadge({ status, type }: StatusBadgeProps) {
  if (type === "finish") {
    if (status === "foil") {
      return (
        <span className="bg-gradient-to-r from-primary/10 to-primary/20 text-primary border border-primary/20 px-2 py-0.5 rounded text-label font-bold">
          FOIL
        </span>
      )
    }
    return <span className="text-muted-foreground/60 text-label font-medium uppercase">Normal</span>
  }

  // Map conditions to colors
  const colors: Record<string, string> = {
    NM: "bg-success/10 text-success border-success/30",
    LP: "bg-info/10 text-info border-info/30",
    MP: "bg-muted/60 text-muted-foreground border-border",
    HP: "bg-warning/10 text-warning border-warning/30",
    DMG: "bg-destructive/10 text-destructive border-destructive/30",
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-label font-medium border px-2 py-0.5 shadow-none",
        colors[status] || colors["MP"]
      )}
    >
      {status}
    </Badge>
  )
}
