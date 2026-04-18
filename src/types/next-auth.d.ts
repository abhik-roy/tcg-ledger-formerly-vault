import { DefaultSession } from "next-auth"

type Role = "ADMIN" | "USER"

export type UserPermissions = {
  inventoryUpdatePrices: boolean
  addCardsAccess: boolean
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: Role
      permissions: UserPermissions | null
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    role: Role
    permissions: UserPermissions | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: Role
    permissions: UserPermissions | null
  }
}
