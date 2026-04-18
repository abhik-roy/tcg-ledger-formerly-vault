import * as React from "react"
import { Heading, Text, Section, Row, Column, Button, Hr } from "@react-email/components"
import EmailLayout from "./EmailLayout"
import { formatCents, formatFinish, formatDate } from "./email-utils"

export interface OrderCancellationEmailProps {
  orderId: string
  customerEmail: string
  items: Array<{
    name: string
    setName: string
    condition: string
    finish: string
    price: number
    quantity: number
  }>
  subtotal: number
  totalAmount: number
  reason: string
  cancelledAt: Date
  storeName?: string
  contactEmail?: string | null
}

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

export default function OrderCancellationEmail({
  orderId,
  customerEmail,
  items,
  subtotal,
  totalAmount,
  reason,
  cancelledAt,
  storeName = "TCG Vault",
  contactEmail,
}: OrderCancellationEmailProps) {
  const orderRef = `#${orderId.slice(-8).toUpperCase()}`
  const previewText = `Your order ${orderRef} has been cancelled`

  return (
    <EmailLayout storeName={storeName} previewText={previewText} contactEmail={contactEmail}>
      {/* -- Header block ------------------------------------------------- */}
      <Heading style={h1}>Order Cancelled</Heading>
      <Text style={subheading}>
        Hi {customerEmail} — your order {orderRef} has been cancelled.
      </Text>

      {/* -- Order reference + cancellation date -------------------------- */}
      <Section style={referenceBox}>
        <Row>
          <Column>
            <Text style={referenceLabel}>Order Reference</Text>
            <Text style={referenceValue}>{orderRef}</Text>
          </Column>
          <Column style={{ textAlign: "right" as const }}>
            <Text style={referenceLabel}>Cancellation Date</Text>
            <Text style={referenceValue}>{formatDate(cancelledAt)}</Text>
          </Column>
        </Row>
      </Section>

      {/* -- Reason box --------------------------------------------------- */}
      <Section style={reasonBox}>
        <Text style={reasonLabel}>Reason:</Text>
        <Text style={reasonText}>{reason}</Text>
      </Section>

      <Hr style={divider} />

      {/* -- Line items --------------------------------------------------- */}
      <Text style={sectionHeading}>Order Summary</Text>

      {items.map((item, i) => (
        <Section key={i} style={i % 2 === 0 ? lineItemEven : lineItemOdd}>
          <Row>
            <Column style={{ width: "60%" }}>
              <Text style={itemName}>{item.name}</Text>
              <Text style={itemMeta}>
                {item.setName} &middot; {item.condition} &middot; {formatFinish(item.finish)}
              </Text>
            </Column>
            <Column style={{ width: "20%", textAlign: "center" as const }}>
              <Text style={itemQty}>&times; {item.quantity}</Text>
            </Column>
            <Column style={{ width: "20%", textAlign: "right" as const }}>
              <Text style={itemPrice}>{formatCents(item.price * item.quantity)}</Text>
              {item.quantity > 1 && (
                <Text style={itemUnitPrice}>{formatCents(item.price)} each</Text>
              )}
            </Column>
          </Row>
        </Section>
      ))}

      <Hr style={divider} />

      {/* -- Totals ------------------------------------------------------- */}
      <Section style={totalsSection}>
        <Row style={totalRow}>
          <Column>
            <Text style={totalLabel}>Subtotal</Text>
          </Column>
          <Column style={{ textAlign: "right" as const }}>
            <Text style={totalValue}>{formatCents(subtotal)}</Text>
          </Column>
        </Row>
        <Hr style={totalDivider} />
        <Row style={totalRow}>
          <Column>
            <Text style={grandTotalLabel}>Total</Text>
          </Column>
          <Column style={{ textAlign: "right" as const }}>
            <Text style={grandTotalValue}>{formatCents(totalAmount)}</Text>
          </Column>
        </Row>
      </Section>

      <Hr style={divider} />

      {/* -- CTA ---------------------------------------------------------- */}
      <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
        <Button href={`${baseUrl}/shop`} style={ctaButton}>
          Visit Store
        </Button>
      </Section>

      {/* -- Footer note -------------------------------------------------- */}
      <Text style={footerNote}>
        If you believe this was a mistake, please contact us
        {contactEmail ? ` at ${contactEmail}` : ""}.
      </Text>
    </EmailLayout>
  )
}

// ---------------------------------------------------------------------------
// Inline styles (required for email client compatibility)
// ---------------------------------------------------------------------------

const h1: React.CSSProperties = {
  fontSize: "26px",
  fontWeight: "bold",
  color: "#1f2937",
  margin: "0 0 8px 0",
}

const subheading: React.CSSProperties = {
  fontSize: "15px",
  color: "#4b5563",
  lineHeight: "22px",
  margin: "0 0 20px 0",
}

const referenceBox: React.CSSProperties = {
  backgroundColor: "#f3f4f6",
  borderRadius: "8px",
  padding: "12px 16px",
  margin: "0 0 20px 0",
}

const referenceLabel: React.CSSProperties = {
  fontSize: "11px",
  color: "#9ca3af",
  fontWeight: "bold",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "0 0 2px 0",
}

const referenceValue: React.CSSProperties = {
  fontSize: "15px",
  fontWeight: "bold",
  color: "#1f2937",
  fontFamily: "monospace",
  margin: "0",
}

const reasonBox: React.CSSProperties = {
  backgroundColor: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "8px",
  padding: "14px 16px",
  margin: "0 0 20px 0",
}

const reasonLabel: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: "bold",
  color: "#991b1b",
  margin: "0 0 4px 0",
}

const reasonText: React.CSSProperties = {
  fontSize: "14px",
  color: "#991b1b",
  margin: "0",
}

const divider: React.CSSProperties = {
  borderColor: "#e5e7eb",
  margin: "16px 0",
}

const sectionHeading: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: "bold",
  color: "#6b7280",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "0 0 8px 0",
}

const lineItemEven: React.CSSProperties = {
  padding: "10px 0",
}

const lineItemOdd: React.CSSProperties = {
  padding: "10px 0",
  backgroundColor: "#f9fafb",
  borderRadius: "4px",
}

const itemName: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: "bold",
  color: "#111827",
  margin: "0 0 2px 0",
}

const itemMeta: React.CSSProperties = {
  fontSize: "12px",
  color: "#6b7280",
  margin: "0",
}

const itemQty: React.CSSProperties = {
  fontSize: "14px",
  color: "#4b5563",
  margin: "0",
  textAlign: "center" as const,
}

const itemPrice: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: "bold",
  color: "#111827",
  margin: "0",
  textAlign: "right" as const,
}

const itemUnitPrice: React.CSSProperties = {
  fontSize: "11px",
  color: "#9ca3af",
  margin: "0",
  textAlign: "right" as const,
}

const totalsSection: React.CSSProperties = {
  margin: "4px 0 0 0",
}

const totalRow: React.CSSProperties = {
  marginBottom: "4px",
}

const totalLabel: React.CSSProperties = {
  fontSize: "14px",
  color: "#4b5563",
  margin: "2px 0",
}

const totalValue: React.CSSProperties = {
  fontSize: "14px",
  color: "#1f2937",
  margin: "2px 0",
  textAlign: "right" as const,
}

const totalDivider: React.CSSProperties = {
  borderColor: "#e5e7eb",
  margin: "8px 0",
}

const grandTotalLabel: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: "bold",
  color: "#1f2937",
  margin: "2px 0",
}

const grandTotalValue: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: "bold",
  color: "#dc2626",
  margin: "2px 0",
  textAlign: "right" as const,
}

const ctaButton: React.CSSProperties = {
  backgroundColor: "#6366f1",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 32px",
}

const footerNote: React.CSSProperties = {
  fontSize: "12px",
  color: "#9ca3af",
  textAlign: "center" as const,
  fontStyle: "italic",
  margin: "0",
  lineHeight: "18px",
}
