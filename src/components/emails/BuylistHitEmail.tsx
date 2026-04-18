import * as React from "react"
import { Heading, Text, Section, Row, Column, Img, Button } from "@react-email/components"
import EmailLayout from "./EmailLayout"
import { formatCents } from "./email-utils"

interface BuylistHitEmailProps {
  cardName: string
  setName: string
  quantityAdded: number
  condition: string
  imageUrl?: string
  buyPrice: number
  storeName?: string
}

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

export default function BuylistHitEmail({
  cardName,
  setName,
  quantityAdded,
  condition,
  imageUrl,
  buyPrice,
  storeName = "TCG Vault",
}: BuylistHitEmailProps) {
  const previewText = `Buylist target acquired: ${cardName}`

  return (
    <EmailLayout storeName={storeName} previewText={previewText}>
      <Heading style={h1}>Buylist Target Acquired!</Heading>

      <Text style={text}>
        Good news! Inventory was just added that matches one of your <b>High Priority</b> buylist
        targets.
      </Text>

      <Section style={cardSection}>
        <Row>
          <Column style={{ width: "100px" }}>
            {imageUrl ? (
              <Img src={imageUrl} width="80" style={{ borderRadius: "5px" }} alt={cardName} />
            ) : (
              <div
                style={{
                  width: 80,
                  height: 110,
                  backgroundColor: "#eee",
                  borderRadius: 5,
                }}
              />
            )}
          </Column>
          <Column>
            <Text style={cardTitle}>{cardName}</Text>
            <Text style={cardSub}>
              {setName} - {condition}
            </Text>
            <Text style={price}>Paid: {formatCents(buyPrice)}</Text>
          </Column>
        </Row>
      </Section>

      <Section style={stats}>
        <Text style={statText}>
          <b>Quantity Added:</b> {quantityAdded}
        </Text>
        <Text style={statText}>Please review the card condition and file it in storage.</Text>
      </Section>

      <Button href={`${baseUrl}/admin/inventory`} style={btn}>
        View Inventory
      </Button>
    </EmailLayout>
  )
}

// --- STYLES (Inline CSS for Email Clients) ---
const h1: React.CSSProperties = {
  fontSize: "26px",
  fontWeight: "bold",
  color: "#1f2937",
  margin: "0 0 8px 0",
}
const text: React.CSSProperties = {
  fontSize: "15px",
  color: "#4b5563",
  lineHeight: "24px",
}
const cardSection: React.CSSProperties = {
  backgroundColor: "#f9fafb",
  padding: "16px",
  borderRadius: "8px",
  margin: "20px 0",
}
const cardTitle: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: "bold",
  color: "#111827",
  margin: "0",
}
const cardSub: React.CSSProperties = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "4px 0 8px 0",
}
const price: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: "bold",
  color: "#059669",
  margin: "0",
}
const stats: React.CSSProperties = { marginBottom: "24px" }
const statText: React.CSSProperties = {
  fontSize: "15px",
  color: "#374151",
  margin: "4px 0",
}
const btn: React.CSSProperties = {
  backgroundColor: "#6366f1",
  borderRadius: "5px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px",
  width: "100%",
}
