import { Chip } from "./chip"

const TONES: Record<string, string> = {
  NM: "var(--signal-green)",
  LP: "var(--accent-cool)",
  MP: "var(--signal-amber)",
  HP: "var(--accent-hot)",
}

export function ConditionChip({ condition }: { condition: string }) {
  const tone = TONES[condition] ?? "var(--ink-3)"
  return (
    <Chip mono tone={tone}>
      {condition}
    </Chip>
  )
}
