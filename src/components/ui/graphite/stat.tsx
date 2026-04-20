import { cn } from "@/lib/utils"

interface StatProps {
  label: string
  value: string | number
  sub?: string
  accent?: boolean
  className?: string
}

export function Stat({ label, value, sub, accent, className }: StatProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="stat-label">{label}</span>
      <span
        className={cn("stat-value", accent && "text-[var(--accent-hot)]")}
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </span>
      {sub && (
        <span className="font-mono text-[10px] tracking-[0.04em] text-[var(--ink-3)]">{sub}</span>
      )}
    </div>
  )
}
