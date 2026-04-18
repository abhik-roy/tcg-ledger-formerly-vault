import { ArrowRight, Star, Zap, Package } from "lucide-react"

const GAMES = [
  {
    label: "Magic: The Gathering",
    value: "magic",
    description: "Alpha, Beta, Modern, Commander & more",
    icon: Star,
  },
  {
    label: "Pokemon TCG",
    value: "pokemon",
    description: "Classic sets, Scarlet & Violet, and all eras",
    icon: Zap,
  },
  {
    label: "Riftbound",
    value: "riftbound",
    description: "The newest TCG -- explore the collection",
    icon: Package,
  },
]

interface LandingContentProps {
  onGameSelect: (game: string) => void
  onBrowseAll: () => void
}

export function LandingContent({ onGameSelect, onBrowseAll }: LandingContentProps) {
  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-10 sm:py-14">
      <p className="text-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-6">
        Browse by Game
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {GAMES.map((game) => (
          <button
            key={game.value}
            onClick={() => onGameSelect(game.value)}
            className="group flex flex-col p-5 sm:p-6 bg-card border border-border rounded-2xl hover:border-primary/50 hover:shadow-lg hover:-translate-y-0.5 transition-all text-left"
          >
            <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
              <game.icon className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-bold text-foreground text-sm sm:text-base">{game.label}</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{game.description}</p>
            <div className="mt-4 flex items-center text-primary text-xs font-semibold">
              Browse{" "}
              <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        ))}
      </div>

      <div className="text-center">
        <button
          onClick={onBrowseAll}
          className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background rounded-xl font-semibold text-sm hover:opacity-90 active:opacity-80 transition-opacity shadow-sm"
        >
          Browse All Cards <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
