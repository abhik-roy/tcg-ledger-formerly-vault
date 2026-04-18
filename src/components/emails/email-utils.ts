export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function formatFinish(finish: string): string {
  if (finish === "foil") return "Foil"
  if (finish === "etched") return "Etched Foil"
  return "Non-Foil"
}

export function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}
