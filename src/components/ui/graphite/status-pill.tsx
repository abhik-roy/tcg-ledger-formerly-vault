import { Chip } from "./chip"

const TONES: Record<string, { tone: string; label: string }> = {
  pending: { tone: "var(--signal-amber)", label: "Pending" },
  accepted: { tone: "var(--signal-green)", label: "Accepted" },
  declined: { tone: "var(--ink-3)", label: "Declined" },
  withdrawn: { tone: "var(--ink-3)", label: "Withdrawn" },
  voided: { tone: "var(--ink-3)", label: "Voided" },
}

export function StatusPill({ status }: { status: string }) {
  const meta = TONES[status] ?? { tone: "var(--ink-3)", label: status }
  return (
    <Chip mono tone={meta.tone}>
      <span
        className="inline-block w-[5px] h-[5px] rounded-full mr-[2px]"
        style={{ background: meta.tone }}
      />
      {meta.label}
    </Chip>
  )
}
