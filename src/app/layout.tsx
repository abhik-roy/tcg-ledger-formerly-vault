import type { Metadata } from "next"
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700", "800"],
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
})

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400"],
  style: ["normal", "italic"],
})

export const metadata: Metadata = {
  title: "TCG Ledger",
  description: "Manage your card collection",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable} ${instrumentSerif.variable}`}
    >
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
