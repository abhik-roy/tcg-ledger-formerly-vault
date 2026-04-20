interface Props {
  n: number | string
  label: string
  accent?: boolean
}

export function LedgerStat({ n, label, accent }: Props) {
  return (
    <div className="flex items-baseline gap-2.5">
      <span
        className="serif"
        style={{
          fontSize: 28,
          letterSpacing: "-0.02em",
          color: accent ? "var(--accent-hot)" : "var(--ink)",
        }}
      >
        {n}
      </span>
      <span
        className="font-mono uppercase"
        style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.08em" }}
      >
        {label}
      </span>
    </div>
  )
}
