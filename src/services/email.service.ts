/**
 * @file email.service.ts
 * @module services/email
 * @description
 *   Email sending service. Uses Nodemailer with configurable SMTP and React
 *   Email templates. A module-level transporter singleton with connection
 *   pooling avoids re-creating connections on every send. Errors are logged
 *   but never thrown to prevent blocking the calling flow (fire-and-forget).
 *
 *   NOTE: Order-related email methods (sendOrderConfirmation, sendOrderCancellation,
 *   sendFulfillmentNotification, sendDisputeNotification, sendWelcomeEmail) have
 *   been shelved along with their email templates. They can be revived from
 *   src/_shelved/ when shop features are re-enabled.
 *
 * @layer Service
 * @dependencies nodemailer, @react-email/render
 */

import nodemailer from "nodemailer"
import { render } from "@react-email/render"
import BuylistHitEmail from "@/components/emails/BuylistHitEmail"
import PasswordResetEmail from "@/components/emails/PasswordResetEmail"

// ---------------------------------------------------------------------------
// Module-level transporter singleton (connection pool)
// ---------------------------------------------------------------------------

const transporter = nodemailer.createTransport({
  host: process.env.NODEMAILER_HOST,
  port: Number(process.env.NODEMAILER_PORT) || 587,
  secure: Number(process.env.NODEMAILER_PORT) === 465,
  auth: {
    user: process.env.NODEMAILER_USER,
    pass: process.env.NODEMAILER_PASS,
  },
  pool: true,
})

export class EmailService {
  /**
   * Sends a buylist hit notification email to the store admin.
   * Called when an imported card matches a buylist target.
   */
  static async sendBuylistHit(data: {
    cardName: string
    setName: string
    quantity: number
    condition: string
    buyPrice: number
    image?: string
  }): Promise<void> {
    try {
      const fromAddress = process.env.NODEMAILER_FROM || process.env.NODEMAILER_USER

      const emailHtml = await render(
        BuylistHitEmail({
          cardName: data.cardName,
          setName: data.setName,
          quantityAdded: data.quantity,
          condition: data.condition,
          buyPrice: data.buyPrice,
          imageUrl: data.image,
        })
      )

      await transporter.sendMail({
        from: `"TCG Ledger System" <${fromAddress}>`,
        to: process.env.ADMIN_EMAIL,
        subject: `Buylist Hit: ${data.cardName}`,
        html: emailHtml,
      })

      console.log(`Sent buylist hit email for ${data.cardName}`)
    } catch (error) {
      console.error("Failed to send email:", error)
      // Intentionally not re-thrown to prevent blocking the import process
    }
  }

  /**
   * Sends a notification to the listing owner when a new trade offer is received.
   * Fire-and-forget — never throws.
   */
  static async sendNewOfferNotification(data: {
    ownerEmail: string
    cardName: string
    offerorName: string
    cashAmount: number
    cardCount: number
  }): Promise<void> {
    try {
      const fromAddress = process.env.NODEMAILER_FROM || process.env.NODEMAILER_USER
      const appName = "TCG Ledger"
      const cashDisplay = data.cashAmount > 0 ? `$${(data.cashAmount / 100).toFixed(2)}` : "$0.00"
      const cardLabel =
        data.cardCount > 0 ? `${data.cardCount} card${data.cardCount > 1 ? "s" : ""}` : "no cards"

      const html = `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
          <h2>New Trade Offer</h2>
          <p><strong>${data.offerorName}</strong> made an offer on your <strong>${data.cardName}</strong>.</p>
          <ul>
            <li>Cash: ${cashDisplay}</li>
            <li>Cards offered: ${cardLabel}</li>
          </ul>
          <p>Log in to review the offer.</p>
          <hr />
          <p style="color: #888; font-size: 12px;">${appName}</p>
        </div>
      `

      await transporter.sendMail({
        from: `"${appName}" <${fromAddress}>`,
        to: data.ownerEmail,
        subject: `New trade offer on ${data.cardName}`,
        html,
      })

      console.log(`Sent new offer notification to ${data.ownerEmail} for ${data.cardName}`)
    } catch (error) {
      console.error("Failed to send new offer notification:", error)
      // Intentionally not re-thrown — fire-and-forget
    }
  }

  /**
   * Sends a password reset email with a tokenized link.
   * The raw token is sent in the email; only the hashed version is stored in DB.
   * Fire-and-forget — never throws.
   */
  static async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    if (!email) return
    try {
      const fromAddress = process.env.NODEMAILER_FROM || process.env.NODEMAILER_USER
      const appName = "TCG Ledger"
      const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/admin/reset-password?token=${resetToken}`

      const emailHtml = await render(
        PasswordResetEmail({
          email,
          resetLink,
          storeName: appName,
        })
      )

      await transporter.sendMail({
        from: `"${appName}" <${fromAddress}>`,
        to: email,
        subject: `Reset your password`,
        html: emailHtml,
      })

      console.log(`Sent password reset email to ${email}`)
    } catch (error) {
      console.error("Failed to send password reset email:", error)
    }
  }
}
