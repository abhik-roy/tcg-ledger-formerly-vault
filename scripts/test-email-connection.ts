import nodemailer from 'nodemailer'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables manually for this script
dotenv.config({ path: path.resolve(process.cwd(), '.env') })
// Note: If you use .env, change path to '.env'

async function main() {
  console.log("🔍 Testing Email Connection...")
  console.log(`👤 User: ${process.env.GMAIL_USER}`)
  
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error("❌ MISSING CREDENTIALS in .env file")
    return
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
    debug: true, // Show detailed logs
    logger: true // Log to console
  })

  try {
    console.log("📨 Attempting to send...")
    const info = await transporter.sendMail({
      from: `"Debug Script" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER, // Send to yourself
      subject: "Test Email from TCG Vault Debugger",
      text: "If you see this, your credentials work!",
    })

    console.log("✅ Success! Message ID:", info.messageId)
  } catch (error) {
    console.error("❌ FAILED:")
    console.error(error)
  }
}

main()