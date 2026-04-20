import { Chip } from "./chip"

const GAME_COLORS: Record<string, string> = {
  magic: "var(--game-magic)",
  pokemon: "var(--game-pokemon)",
  yugioh: "var(--game-yugioh)",
  lorcana: "var(--game-lorcana)",
}

const LABELS: Record<string, string> = {
  magic: "Magic",
  pokemon: "Pokémon",
  yugioh: "Yu-Gi-Oh",
  lorcana: "Lorcana",
}

export function GameChip({ game }: { game: string }) {
  const key = game.toLowerCase()
  const color = GAME_COLORS[key] ?? "var(--ink-3)"
  const label = LABELS[key] ?? game
  return (
    <Chip mono tone={color}>
      <span className="inline-block w-[5px] h-[5px] rounded-full" style={{ background: color }} />
      {label}
    </Chip>
  )
}
