export const FILTER_OPTIONS = {
  games: [
    { label: "Magic: The Gathering", value: "magic" },
    { label: "Pokémon", value: "pokemon" },
    { label: "Riftbound", value: "riftbound" },
  ],
  rarities: [
    { label: "Common", value: "common" },
    { label: "Uncommon", value: "uncommon" },
    { label: "Rare", value: "rare" },
    { label: "Mythic", value: "mythic" },
    { label: "Promo", value: "promo" },
  ],
  conditions: [
    { label: "Near Mint", value: "NM" },
    { label: "Lightly Played", value: "LP" },
    { label: "Moderately Played", value: "MP" },
    { label: "Heavily Played", value: "HP" },
    { label: "Damaged", value: "DMG" },
  ],
  // In a real app, sets should probably come from an API, 
  // but this works for now.
  sets: [
    { label: "Alpha", value: "lea" },
    { label: "Beta", value: "leb" },
    { label: "Unlimited", value: "2ed" },
    { label: "Revised", value: "3ed" },
    { label: "Commander Masters", value: "cmm" },
  ]
}