/* eslint-disable @typescript-eslint/no-explicit-any */
import "@/lib/env"
import NextAuth from "next-auth"
import { prisma } from "@/lib/prisma"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, _request) {
        const rawEmail = credentials?.email as string
        const password = credentials?.password as string

        if (!rawEmail || !password) return null

        const email = rawEmail.trim().toLowerCase()
        const user = await prisma.user.findUnique({
          where: { email },
          include: { permissions: true },
        })
        if (!user) return null

        const isValid = await bcrypt.compare(password, user.password || "")
        if (!isValid) return null

        const role = (user.role as string) || "USER"

        // Build permissions object — null means ADMIN (bypasses all checks)
        const perms = user.permissions
        const permissions =
          role === "ADMIN"
            ? null
            : {
                inventoryUpdatePrices: perms?.inventoryUpdatePrices ?? false,
                addCardsAccess: perms?.addCardsAccess ?? true,
              }

        return {
          id: user.id,
          email: user.email,
          name: user.displayName || user.name || user.email,
          image: user.image,
          role: role as any,
          permissions,
        } as any
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.displayName = user.name
        token.permissions = (user as any).permissions
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        const user = session.user as any
        user.id = token.id as string
        user.role = token.role
        user.displayName = token.displayName
        user.permissions = token.permissions
      }
      return session
    },
  },
  pages: {
    signIn: "/admin/login",
  },
})
