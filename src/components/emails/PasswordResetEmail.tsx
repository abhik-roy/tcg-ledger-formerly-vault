import * as React from "react"
import { Heading, Text, Section, Button, Hr } from "@react-email/components"
import EmailLayout from "./EmailLayout"

interface PasswordResetEmailProps {
  email: string
  resetLink: string
  storeName?: string
}

export default function PasswordResetEmail({
  email,
  resetLink,
  storeName = "TCG Vault",
}: PasswordResetEmailProps) {
  const previewText = `Reset your ${storeName} password`

  return (
    <EmailLayout storeName={storeName} previewText={previewText}>
      <Heading style={h1}>Reset Your Password</Heading>
      <Text style={subheading}>
        We received a request to reset the password for your account ({email}).
      </Text>

      <Text style={body}>
        Click the button below to choose a new password. This link expires in 1 hour and can only
        be used once.
      </Text>

      <Section style={{ textAlign: "center" as const, margin: "28px 0" }}>
        <Button href={resetLink} style={ctaButton}>
          Reset My Password
        </Button>
      </Section>

      <Section style={warningBox}>
        <Text style={warningTitle}>Didn&apos;t request this?</Text>
        <Text style={warningBody}>
          If you did not request a password reset, you can safely ignore this email. Your password
          will not be changed.
        </Text>
      </Section>

      <Hr style={divider} />

      <Text style={securityNote}>
        For security, this link can only be used once and expires in 1 hour. Never share this link
        with anyone.
      </Text>

      <Text style={plainLinkNote}>If the button above does not work, copy and paste this URL:</Text>
      <Text style={plainLink}>{resetLink}</Text>
    </EmailLayout>
  )
}

// ---------------------------------------------------------------------------
// Inline styles
// ---------------------------------------------------------------------------

const h1: React.CSSProperties = { fontSize: "26px", fontWeight: "bold", color: "#1f2937", margin: "0 0 8px 0" }
const subheading: React.CSSProperties = { fontSize: "15px", color: "#4b5563", lineHeight: "22px", margin: "0 0 16px 0" }
const body: React.CSSProperties = { fontSize: "15px", color: "#374151", lineHeight: "24px", margin: "0 0 4px 0" }
const divider: React.CSSProperties = { borderColor: "#e5e7eb", margin: "16px 0" }
const warningBox: React.CSSProperties = { backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "14px 16px", margin: "20px 0" }
const warningTitle: React.CSSProperties = { fontSize: "14px", fontWeight: "bold", color: "#92400e", margin: "0 0 4px 0" }
const warningBody: React.CSSProperties = { fontSize: "14px", color: "#374151", margin: "0" }
const ctaButton: React.CSSProperties = { backgroundColor: "#6366f1", borderRadius: "6px", color: "#ffffff", fontSize: "15px", fontWeight: "bold", textDecoration: "none", textAlign: "center" as const, display: "inline-block", padding: "12px 32px" }
const securityNote: React.CSSProperties = { fontSize: "12px", color: "#9ca3af", textAlign: "center" as const, margin: "0 0 8px 0", lineHeight: "18px" }
const plainLinkNote: React.CSSProperties = { fontSize: "12px", color: "#9ca3af", textAlign: "center" as const, margin: "0 0 4px 0" }
const plainLink: React.CSSProperties = { fontSize: "11px", color: "#6366f1", textAlign: "center" as const, wordBreak: "break-all" as const, fontFamily: "monospace", margin: "0" }
