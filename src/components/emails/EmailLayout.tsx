import * as React from "react"
import { Html, Head, Body, Container, Section, Text, Hr, Preview } from "@react-email/components"

interface EmailLayoutProps {
  storeName?: string
  contactEmail?: string | null
  previewText?: string
  children: React.ReactNode
}

/**
 * Shared React Email layout wrapper for all transactional emails.
 * Provides consistent branding: header with logo/store name, content area,
 * and footer with copyright.
 */
export default function EmailLayout({ storeName = "TCG Vault", contactEmail: _contactEmail, previewText, children }: EmailLayoutProps) {
  const currentYear = new Date().getFullYear()

  return (
    <Html>
      {previewText && <Preview>{previewText}</Preview>}
      <Head />
      <Body style={main}>
        <Container style={container}>
          {/* ── Header ─────────────────────────────────────── */}
          <Section style={header}>
            <div style={logoBox}>V</div>
            <Text style={brandName}>{storeName}</Text>
          </Section>

          <Hr style={divider} />

          {/* ── Content ────────────────────────────────────── */}
          <Section style={content}>{children}</Section>

          {/* ── Footer ─────────────────────────────────────── */}
          <Hr style={divider} />
          <Section style={footer}>
            <Text style={footerText}>
              {currentYear} {storeName}. All rights reserved.
            </Text>
            <Text style={canSpamText}>
              You received this email because you have an account or placed an order with {storeName}.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// ---------------------------------------------------------------------------
// Inline styles (required for email client compatibility)
// ---------------------------------------------------------------------------

const main: React.CSSProperties = {
  backgroundColor: "#f6f9fc",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
}

const container: React.CSSProperties = {
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "580px",
}

const header: React.CSSProperties = {
  textAlign: "center" as const,
  paddingBottom: "16px",
}

const logoBox: React.CSSProperties = {
  display: "inline-block",
  width: "40px",
  height: "40px",
  lineHeight: "40px",
  backgroundColor: "#6366f1",
  color: "#ffffff",
  fontSize: "20px",
  fontWeight: "bold",
  borderRadius: "8px",
  textAlign: "center" as const,
}

const brandName: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: "bold",
  color: "#1f2937",
  margin: "8px 0 0 0",
}

const divider: React.CSSProperties = {
  borderColor: "#e5e7eb",
  margin: "0",
}

const content: React.CSSProperties = {
  padding: "24px 0",
}

const footer: React.CSSProperties = {
  textAlign: "center" as const,
  paddingTop: "16px",
}

const footerText: React.CSSProperties = {
  fontSize: "12px",
  color: "#9ca3af",
  margin: "0",
}

const canSpamText: React.CSSProperties = {
  fontSize: "11px",
  color: "#9ca3af",
  textAlign: "center" as const,
  margin: "8px 0 0 0",
}
