import * as React from "react"
import { Heading, Text, Section, Row, Column, Button, Hr } from "@react-email/components"
import EmailLayout from "./EmailLayout"
import { formatCents, formatFinish, formatDate } from "./email-utils"

export interface OrderConfirmationEmailProps {
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
  tax: number
  shippingCost: number
  totalAmount: number
  fulfillment: string
  paymentMethod: string
  addressLine1?: string | null
  city?: string | null
  postalCode?: string | null
  createdAt: Date
  storeName?: string
  contactEmail?: string | null
}

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

export default function OrderConfirmationEmail({
  orderId,
  customerEmail,
  items,
  subtotal,
  tax,
  shippingCost,
  totalAmount,
  fulfillment,
  addressLine1,
  city,
  postalCode,
  createdAt,
  storeName = "TCG Vault",
  contactEmail,
}: OrderConfirmationEmailProps) {
  const orderRef = `#${orderId.slice(-8).toUpperCase()}`
  const isShipping = fulfillment === "SHIPPING"
  const previewText = `Your order ${orderRef} is confirmed`

  return (
    <EmailLayout storeName={storeName} previewText={previewText} contactEmail={contactEmail}>
      {/* ── Header block ────────────────────────────────────────── */}
      <Heading style={h1}>Order Confirmed</Heading>
      <Text style={subheading}>
        Hi {customerEmail} — your order has been received and is being processed.
      </Text>

      {/* ── Order reference + date ───────────────────────────────── */}
      <Section style={referenceBox}>
        <Row>
          <Column>
            <Text style={referenceLabel}>Order Reference</Text>
            <Text style={referenceValue}>{orderRef}</Text>
          </Column>
          <Column style={{ textAlign: "right" as const }}>
            <Text style={referenceLabel}>Date Placed</Text>
            <Text style={referenceValue}>{formatDate(createdAt)}</Text>
          </Column>
        </Row>
      </Section>

      {/* ── Fulfillment section (above items — customers want this first) ── */}
      <Section style={fulfillmentBox}>
        {isShipping ? (
          <>
            <Text style={fulfillmentTitle}>Shipping Details</Text>
            <Text style={fulfillmentBody}>Your order will be shipped to:</Text>
            <Text style={fulfillmentAddress}>
              {addressLine1}
              {city && postalCode ? `, ${city} ${postalCode}` : city || postalCode || ""}
            </Text>
            <Text style={fulfillmentEta}>
              Estimated dispatch: 1–2 business days. You will receive a tracking email when your
              order ships.
            </Text>
          </>
        ) : (
          <>
            <Text style={fulfillmentTitle}>Store Pickup</Text>
            <Text style={fulfillmentBody}>
              Your order will be ready for pickup within 1–2 business days. We will email you when
              it is ready to collect.
            </Text>
          </>
        )}
      </Section>

      <Hr style={divider} />

      {/* ── Line items ──────────────────────────────────────────── */}
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
              <Text style={itemQty}>× {item.quantity}</Text>
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

      {/* ── Totals ──────────────────────────────────────────────── */}
      <Section style={totalsSection}>
        <Row style={totalRow}>
          <Column>
            <Text style={totalLabel}>Subtotal</Text>
          </Column>
          <Column style={{ textAlign: "right" as const }}>
            <Text style={totalValue}>{formatCents(subtotal)}</Text>
          </Column>
        </Row>
        {tax > 0 && (
          <Row style={totalRow}>
            <Column>
              <Text style={totalLabel}>Tax</Text>
            </Column>
            <Column style={{ textAlign: "right" as const }}>
              <Text style={totalValue}>{formatCents(tax)}</Text>
            </Column>
          </Row>
        )}
        {shippingCost > 0 && (
          <Row style={totalRow}>
            <Column>
              <Text style={totalLabel}>Shipping</Text>
            </Column>
            <Column style={{ textAlign: "right" as const }}>
              <Text style={totalValue}>{formatCents(shippingCost)}</Text>
            </Column>
          </Row>
        )}
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

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
        <Button href={`${baseUrl}/shop/orders`} style={ctaButton}>
          View Order Status
        </Button>
      </Section>

      {/* ── Footer note ─────────────────────────────────────────── */}
      <Text style={footerNote}>
        We will send updates on your order status to this email address.
        {contactEmail
          ? ` Questions? Contact us at ${contactEmail}.`
          : ` Questions? Reply to this email or visit ${baseUrl}/shop.`}
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

const fulfillmentBox: React.CSSProperties = {
  backgroundColor: "#eff6ff",
  border: "1px solid #bfdbfe",
  borderRadius: "8px",
  padding: "14px 16px",
  margin: "0 0 20px 0",
}

const fulfillmentTitle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: "bold",
  color: "#1e40af",
  margin: "0 0 4px 0",
}

const fulfillmentBody: React.CSSProperties = {
  fontSize: "14px",
  color: "#374151",
  margin: "0 0 4px 0",
}

const fulfillmentAddress: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: "bold",
  color: "#1f2937",
  margin: "0 0 6px 0",
}

const fulfillmentEta: React.CSSProperties = {
  fontSize: "13px",
  color: "#6b7280",
  margin: "0",
  fontStyle: "italic",
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
  color: "#059669",
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
