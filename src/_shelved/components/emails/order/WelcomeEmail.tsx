import * as React from "react"
import { Heading, Text, Section, Button, Hr } from "@react-email/components"
import EmailLayout from "./EmailLayout"

interface WelcomeEmailProps {
  email: string
  firstName?: string | null
  storeName?: string
}

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

export default function WelcomeEmail({
  email,
  firstName,
  storeName = "TCG Vault",
}: WelcomeEmailProps) {
  const greeting = firstName ? `Hi ${firstName}` : "Hi there"
  const previewText = `Welcome to ${storeName} — start browsing our collection!`

  return (
    <EmailLayout storeName={storeName} previewText={previewText}>
      <Heading style={h1}>Welcome to {storeName}!</Heading>
      <Text style={subheading}>
        {greeting} — thanks for creating an account. We&apos;re excited to have you.
      </Text>

      <Text style={body}>
        Browse our collection of trading card singles across Magic: The Gathering, Pokémon, and
        more. Whether you&apos;re building a competitive deck or completing your collection,
        we&apos;ve got you covered.
      </Text>

      <Section style={{ textAlign: "center" as const, margin: "28px 0" }}>
        <Button href={`${baseUrl}/shop`} style={ctaButton}>
          Browse the Catalog
        </Button>
      </Section>

      <Hr style={divider} />

      <Section style={infoBox}>
        <Text style={infoTitle}>Your Account</Text>
        <Text style={infoBody}>
          You can sign in at any time to view your orders, track shipments, and manage your profile.
          Your account email is <strong>{email}</strong>.
        </Text>
      </Section>

      <Text style={footerNote}>
        This is a one-time welcome email. You will only receive emails about orders you place.
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
  margin: "0 0 16px 0",
}
const body: React.CSSProperties = {
  fontSize: "15px",
  color: "#374151",
  lineHeight: "24px",
  margin: "0 0 4px 0",
}
const divider: React.CSSProperties = { borderColor: "#e5e7eb", margin: "16px 0" }
const infoBox: React.CSSProperties = {
  backgroundColor: "#eff6ff",
  border: "1px solid #bfdbfe",
  borderRadius: "8px",
  padding: "14px 16px",
  margin: "0 0 20px 0",
}
const infoTitle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: "bold",
  color: "#1e40af",
  margin: "0 0 4px 0",
}
const infoBody: React.CSSProperties = { fontSize: "14px", color: "#374151", margin: "0" }
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
