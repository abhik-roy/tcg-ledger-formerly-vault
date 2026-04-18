import * as React from "react"
import { Heading, Text, Section, Row, Column, Button, Hr } from "@react-email/components"
import EmailLayout from "./EmailLayout"

export interface DisputeNotificationEmailProps {
  chargeId: string
  amount: number // in cents
  customerEmail?: string
  dashboardLink: string
}

export default function DisputeNotificationEmail({
  chargeId,
  amount,
  customerEmail,
  dashboardLink,
}: DisputeNotificationEmailProps) {
  const amountDollars = `$${(amount / 100).toFixed(2)}`

  return (
    <EmailLayout
      storeName="TCG Vault System"
      previewText={`Payment dispute received — ${amountDollars}`}
    >
      <Heading style={h1}>Payment Dispute Received</Heading>
      <Text style={subheading}>
        A customer has opened a payment dispute. Immediate action may be required.
      </Text>

      <Section style={detailBox}>
        <Row style={detailRow}>
          <Column style={labelCol}>
            <Text style={detailLabel}>Charge ID</Text>
          </Column>
          <Column>
            <Text style={detailValue}>{chargeId}</Text>
          </Column>
        </Row>
        <Row style={detailRow}>
          <Column style={labelCol}>
            <Text style={detailLabel}>Disputed Amount</Text>
          </Column>
          <Column>
            <Text style={amountValue}>{amountDollars}</Text>
          </Column>
        </Row>
        {customerEmail && (
          <Row style={detailRow}>
            <Column style={labelCol}>
              <Text style={detailLabel}>Customer Email</Text>
            </Column>
            <Column>
              <Text style={detailValue}>{customerEmail}</Text>
            </Column>
          </Row>
        )}
      </Section>

      <Hr style={divider} />

      <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
        <Button href={dashboardLink} style={ctaButton}>
          View in Stripe Dashboard
        </Button>
      </Section>

      <Text style={footerNote}>
        You typically have 7 days to respond to a dispute. Act promptly to avoid automatic
        resolution in the customer&apos;s favor.
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
  color: "#dc2626",
  margin: "0 0 8px 0",
}
const subheading: React.CSSProperties = {
  fontSize: "15px",
  color: "#4b5563",
  lineHeight: "22px",
  margin: "0 0 20px 0",
}
const detailBox: React.CSSProperties = {
  backgroundColor: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "8px",
  padding: "14px 16px",
  margin: "0 0 20px 0",
}
const detailRow: React.CSSProperties = { marginBottom: "8px" }
const labelCol: React.CSSProperties = { width: "140px" }
const detailLabel: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: "bold",
  color: "#6b7280",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "0",
}
const detailValue: React.CSSProperties = {
  fontSize: "14px",
  color: "#1f2937",
  fontFamily: "monospace",
  margin: "0",
}
const amountValue: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: "bold",
  color: "#dc2626",
  margin: "0",
}
const divider: React.CSSProperties = { borderColor: "#e5e7eb", margin: "16px 0" }
const ctaButton: React.CSSProperties = {
  backgroundColor: "#dc2626",
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
