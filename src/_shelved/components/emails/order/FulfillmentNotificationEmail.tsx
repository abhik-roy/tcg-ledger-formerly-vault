import * as React from "react"
import { Heading, Text, Section, Row, Column, Button, Hr } from "@react-email/components"
import EmailLayout from "./EmailLayout"
import { formatCents, formatFinish, formatDate } from "./email-utils"

export interface FulfillmentNotificationEmailProps {
  orderId: string
  customerEmail: string
  fulfillment: string
  trackingNumber?: string | null
  carrier?: string | null
  items: Array<{
    name: string
    setName: string
    condition: string
    finish: string
    price: number
    quantity: number
  }>
  totalAmount: number
  addressLine1?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  storeName?: string
  contactEmail?: string | null
}

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

export default function FulfillmentNotificationEmail({
  orderId,
  customerEmail,
  fulfillment,
  trackingNumber,
  carrier,
  items,
  totalAmount,
  addressLine1,
  city,
  state,
  postalCode,
  storeName = "TCG Vault",
  contactEmail,
}: FulfillmentNotificationEmailProps) {
  const orderRef = `#${orderId.slice(-8).toUpperCase()}`
  const isShipping = fulfillment === "SHIPPING"
  const previewText = isShipping
    ? `Your order ${orderRef} has shipped${carrier ? ` via ${carrier}` : ""}!`
    : `Your order ${orderRef} is ready for pickup!`

  const trackingUrl = trackingNumber
    ? carrier === "UPS"
      ? `https://www.ups.com/track?tracknum=${trackingNumber}`
      : carrier === "FedEx"
        ? `https://www.fedex.com/apps/fedextrack/?tracknumbers=${trackingNumber}`
        : `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`
    : null

  return (
    <EmailLayout storeName={storeName} contactEmail={contactEmail} previewText={previewText}>
      <Heading style={h1}>
        {isShipping ? "Your Order Has Shipped!" : "Your Order Is Ready for Pickup!"}
      </Heading>
      <Text style={subheading}>
        {isShipping
          ? `Hi ${customerEmail} — great news! Your order ${orderRef} is on its way.`
          : `Hi ${customerEmail} — your order ${orderRef} is ready to collect at our store.`}
      </Text>

      <Section style={referenceBox}>
        <Row>
          <Column>
            <Text style={referenceLabel}>Order Reference</Text>
            <Text style={referenceValue}>{orderRef}</Text>
          </Column>
          <Column style={{ textAlign: "right" as const }}>
            <Text style={referenceLabel}>{isShipping ? "Shipped" : "Ready"} On</Text>
            <Text style={referenceValue}>{formatDate(new Date())}</Text>
          </Column>
        </Row>
      </Section>

      <Section style={isShipping ? shippingBox : pickupBox}>
        {isShipping ? (
          <>
            <Text style={fulfillmentTitle}>Shipping Details</Text>
            {carrier && (
              <Text style={fulfillmentBody}>
                Carrier: <strong>{carrier}</strong>
              </Text>
            )}
            {trackingNumber && (
              <Text style={fulfillmentBody}>
                Tracking: <strong style={{ fontFamily: "monospace" }}>{trackingNumber}</strong>
              </Text>
            )}
            {addressLine1 && (
              <Text style={fulfillmentAddress}>
                Delivering to: {addressLine1}
                {city ? `, ${city}` : ""}
                {state ? ` ${state}` : ""}
                {postalCode ? ` ${postalCode}` : ""}
              </Text>
            )}
          </>
        ) : (
          <>
            <Text style={fulfillmentTitle}>Pickup Information</Text>
            <Text style={fulfillmentBody}>
              Your order is packed and ready. Please bring your order reference{" "}
              <strong>{orderRef}</strong> when you visit.
            </Text>
            <Text style={fulfillmentEta}>Store hours: Mon–Fri 10am–6pm, Sat 10am–4pm</Text>
          </>
        )}
      </Section>

      <Hr style={divider} />

      <Text style={sectionHeading}>Items in This Order</Text>
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
            </Column>
          </Row>
        </Section>
      ))}

      <Hr style={divider} />

      <Section style={totalsSection}>
        <Row>
          <Column>
            <Text style={grandTotalLabel}>Order Total</Text>
          </Column>
          <Column style={{ textAlign: "right" as const }}>
            <Text style={grandTotalValue}>{formatCents(totalAmount)}</Text>
          </Column>
        </Row>
      </Section>

      <Hr style={divider} />

      <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
        {isShipping && trackingUrl ? (
          <Button href={trackingUrl} style={ctaButton}>
            Track Your Package
          </Button>
        ) : (
          <Button href={`${baseUrl}/shop/orders`} style={ctaButton}>
            View Order Details
          </Button>
        )}
      </Section>

      <Text style={footerNote}>
        {contactEmail
          ? `Questions? Contact us at ${contactEmail}.`
          : `Questions? Visit ${baseUrl}/shop or reply to this email.`}
      </Text>
    </EmailLayout>
  )
}

// ---------------------------------------------------------------------------
// Inline styles
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
const shippingBox: React.CSSProperties = {
  backgroundColor: "#f0fdf4",
  border: "1px solid #bbf7d0",
  borderRadius: "8px",
  padding: "14px 16px",
  margin: "0 0 20px 0",
}
const pickupBox: React.CSSProperties = {
  backgroundColor: "#eff6ff",
  border: "1px solid #bfdbfe",
  borderRadius: "8px",
  padding: "14px 16px",
  margin: "0 0 20px 0",
}
const fulfillmentTitle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: "bold",
  color: "#166534",
  margin: "0 0 6px 0",
}
const fulfillmentBody: React.CSSProperties = {
  fontSize: "14px",
  color: "#374151",
  margin: "0 0 4px 0",
}
const fulfillmentAddress: React.CSSProperties = {
  fontSize: "13px",
  color: "#6b7280",
  margin: "6px 0 0 0",
  fontStyle: "italic",
}
const fulfillmentEta: React.CSSProperties = {
  fontSize: "13px",
  color: "#6b7280",
  margin: "6px 0 0 0",
  fontStyle: "italic",
}
const divider: React.CSSProperties = { borderColor: "#e5e7eb", margin: "16px 0" }
const sectionHeading: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: "bold",
  color: "#6b7280",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "0 0 8px 0",
}
const lineItemEven: React.CSSProperties = { padding: "10px 0" }
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
const itemMeta: React.CSSProperties = { fontSize: "12px", color: "#6b7280", margin: "0" }
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
const totalsSection: React.CSSProperties = { margin: "4px 0 0 0" }
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
