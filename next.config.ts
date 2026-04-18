import type { NextConfig } from "next"

// DEV-18: Security headers applied to all responses
const securityHeaders = [
  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Disallow framing (clickjacking protection)
  { key: "X-Frame-Options", value: "DENY" },
  // Limit referrer information sent cross-origin
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable unnecessary browser features
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  // Basic CSP: allow same-origin resources + known image CDNs
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Scripts: self + Next.js inline scripts
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV !== "production" ? " 'unsafe-eval'" : ""}`,
      // Styles: self + inline (required by Tailwind / shadcn)
      "style-src 'self' 'unsafe-inline'",
      // Images: self + Scryfall + PokémonTCG CDNs + data URIs
      "img-src 'self' data: https://cards.scryfall.io https://images.pokemontcg.io",
      // Fonts: self
      "font-src 'self'",
      // Frames: none needed
      "frame-src 'none'",
      // Connections: self + Scryfall API
      "connect-src 'self' https://api.scryfall.com",
    ].join("; "),
  },
]

const nextConfig: NextConfig = {
  // Standalone output for self-hosted deployment
  output: "standalone",
  // 1. Allow external images from Scryfall and PokémonTCG
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cards.scryfall.io",
      },
      {
        protocol: "https",
        hostname: "images.pokemontcg.io",
      },
    ],
  },
  // 2. Pin Turbopack root to this package dir so it doesn't walk up to the
  //    monorepo root and get confused by the root package-lock.json.
  turbopack: {
    root: ".",
  },
  // 3. Redirect root to admin dashboard
  async redirects() {
    return [
      {
        source: "/",
        destination: "/admin",
        permanent: false,
      },
    ]
  },
  // 4. Security headers on all routes (DEV-18)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
