import { cn } from "@/lib/utils"

export function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn("section-label", className)}>{children}</div>
}
