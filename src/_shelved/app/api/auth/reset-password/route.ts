import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import crypto from "crypto"

const PASSWORD_SPECIAL_REGEX = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const token: string = typeof body.token === "string" ? body.token.trim() : ""
    const newPassword: string = typeof body.newPassword === "string" ? body.newPassword : ""

    if (!token) {
      return NextResponse.json({ message: "Invalid or expired reset link." }, { status: 400 })
    }

    if (!newPassword || newPassword.length < 8 || newPassword.length > 128) {
      return NextResponse.json(
        { message: "Password must be between 8 and 128 characters." },
        { status: 400 }
      )
    }

    if (!PASSWORD_SPECIAL_REGEX.test(newPassword)) {
      return NextResponse.json(
        { message: "Password must contain at least one number or special character." },
        { status: 400 }
      )
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex")

    const customer = await prisma.customer.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpiry: { gt: new Date() },
      },
    })

    if (!customer) {
      return NextResponse.json({ message: "Invalid or expired reset link." }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)

    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    })

    return NextResponse.json({ message: "Password reset successfully." }, { status: 200 })
  } catch (error) {
    console.error("RESET_PASSWORD_ERROR", error)
    return NextResponse.json(
      { message: "An unexpected error occurred. Please try again." },
      { status: 500 }
    )
  }
}
