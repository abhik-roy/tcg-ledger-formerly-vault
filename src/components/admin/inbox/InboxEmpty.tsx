import { Eyebrow } from "@/components/ui/graphite"

const COPY: Record<string, { eyebrow: string; head: string; body: string }> = {
  incoming: {
    eyebrow: "Nothing in the tray",
    head: "No offers yet.",
    body: "List a card in your binder and offers will arrive here, sorted by how close they come to your ask.",
  },
  sent: {
    eyebrow: "You haven\u2019t written one",
    head: "No offers sent.",
    body: "Find something in the binder. The first offer is the hardest \u2014 it gets easier.",
  },
  settled: {
    eyebrow: "A blank ledger",
    head: "Nothing settled yet.",
    body: "Accepted, declined, and withdrawn offers will accumulate here as a record of everything you traded.",
  },
}

export function InboxEmpty({ tab }: { tab: "incoming" | "sent" | "settled" }) {
  const copy = COPY[tab]
  return (
    <div
      className="px-6 py-20 text-center"
      style={{
        border: "1px dashed var(--rule-strong)",
        borderRadius: "var(--radius)",
        background: "var(--bg-sunk)",
      }}
    >
      <div className="inline-block mb-3">
        <Eyebrow>{copy.eyebrow}</Eyebrow>
      </div>
      <h2
        className="serif-italic mb-2.5"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 40,
          fontWeight: 400,
          fontStyle: "italic",
          letterSpacing: "-0.02em",
        }}
      >
        {copy.head}
      </h2>
      <p
        className="mx-auto max-w-[440px]"
        style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6 }}
      >
        {copy.body}
      </p>
    </div>
  )
}
