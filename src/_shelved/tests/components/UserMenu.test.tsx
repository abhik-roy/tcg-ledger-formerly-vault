/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

const mockSignOut = vi.fn()
const mockUseSession = vi.fn()

vi.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
  signOut: (...args: unknown[]) => mockSignOut(...args),
}))

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

import UserMenu from "@/components/shop/UserMenu"

const guestSession = { data: null }

const customerSession = {
  data: {
    user: {
      name: "Jane Doe",
      email: "jane@example.com",
      role: "CUSTOMER",
    },
  },
}

const adminSession = {
  data: {
    user: {
      name: "Admin User",
      email: "admin@example.com",
      role: "ADMIN",
    },
  },
}

describe("UserMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("unauthenticated", () => {
    it("renders a Sign in link to /shop/login", () => {
      mockUseSession.mockReturnValue(guestSession)
      render(<UserMenu />)
      const link = screen.getByRole("link", { name: /sign in/i })
      expect(link).toHaveAttribute("href", "/shop/login")
    })

    it("does NOT link to /api/auth/signin", () => {
      mockUseSession.mockReturnValue(guestSession)
      render(<UserMenu />)
      const link = screen.getByRole("link", { name: /sign in/i })
      expect(link.getAttribute("href")).not.toContain("/api/auth/signin")
    })

    it("shows no user name or avatar when logged out", () => {
      mockUseSession.mockReturnValue(guestSession)
      render(<UserMenu />)
      expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument()
    })
  })

  describe("authenticated customer", () => {
    it("renders user initials in avatar", () => {
      mockUseSession.mockReturnValue(customerSession)
      render(<UserMenu />)
      expect(screen.getByText("JD")).toBeInTheDocument()
    })

    it("renders user name", () => {
      mockUseSession.mockReturnValue(customerSession)
      render(<UserMenu />)
      expect(screen.getByText("Jane Doe")).toBeInTheDocument()
    })

    it("dropdown is hidden by default", () => {
      mockUseSession.mockReturnValue(customerSession)
      render(<UserMenu />)
      expect(screen.queryByText("My Profile")).not.toBeInTheDocument()
    })

    it("shows dropdown with profile and sign out when avatar clicked", () => {
      mockUseSession.mockReturnValue(customerSession)
      render(<UserMenu />)
      fireEvent.click(screen.getByText("Jane Doe"))
      expect(screen.getByText("My Profile")).toBeInTheDocument()
      expect(screen.getByText("Sign Out")).toBeInTheDocument()
    })

    it("My Profile link goes to /shop/profile", () => {
      mockUseSession.mockReturnValue(customerSession)
      render(<UserMenu />)
      fireEvent.click(screen.getByText("Jane Doe"))
      const link = screen.getByRole("link", { name: /my profile/i })
      expect(link).toHaveAttribute("href", "/shop/profile")
    })

    it("does NOT show Admin Dashboard link for CUSTOMER role", () => {
      mockUseSession.mockReturnValue(customerSession)
      render(<UserMenu />)
      fireEvent.click(screen.getByText("Jane Doe"))
      expect(screen.queryByText("Admin Dashboard")).not.toBeInTheDocument()
    })

    it("calls signOut with callbackUrl /shop when Sign Out clicked", () => {
      mockSignOut.mockResolvedValue(undefined)
      mockUseSession.mockReturnValue(customerSession)
      render(<UserMenu />)
      fireEvent.click(screen.getByText("Jane Doe"))
      fireEvent.click(screen.getByText("Sign Out"))
      expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: "/shop" })
    })

    it("shows email in dropdown header", () => {
      mockUseSession.mockReturnValue(customerSession)
      render(<UserMenu />)
      fireEvent.click(screen.getByText("Jane Doe"))
      expect(screen.getByText("jane@example.com")).toBeInTheDocument()
    })

    it("closes dropdown when backdrop is clicked", () => {
      mockUseSession.mockReturnValue(customerSession)
      render(<UserMenu />)
      fireEvent.click(screen.getByText("Jane Doe"))
      expect(screen.getByText("My Profile")).toBeInTheDocument()
      // Click the fixed inset-0 backdrop
      const backdrop = document.querySelector(".fixed.inset-0.z-10") as HTMLElement
      fireEvent.click(backdrop)
      expect(screen.queryByText("My Profile")).not.toBeInTheDocument()
    })
  })

  describe("authenticated admin", () => {
    it("shows Admin Dashboard link for ADMIN role", () => {
      mockUseSession.mockReturnValue(adminSession)
      render(<UserMenu />)
      fireEvent.click(screen.getByText("Admin User"))
      const link = screen.getByRole("link", { name: /admin dashboard/i })
      expect(link).toHaveAttribute("href", "/admin/inventory")
    })

    it("also shows My Profile and Sign Out for admins", () => {
      mockUseSession.mockReturnValue(adminSession)
      render(<UserMenu />)
      fireEvent.click(screen.getByText("Admin User"))
      expect(screen.getByText("My Profile")).toBeInTheDocument()
      expect(screen.getByText("Sign Out")).toBeInTheDocument()
    })

    it("renders correct initials for admin", () => {
      mockUseSession.mockReturnValue(adminSession)
      render(<UserMenu />)
      expect(screen.getByText("AU")).toBeInTheDocument()
    })
  })

  describe("authenticated user with no name", () => {
    it("shows first letter of email as initial when name is null", () => {
      mockUseSession.mockReturnValue({
        data: { user: { name: null, email: "zara@example.com", role: "CUSTOMER" } },
      })
      render(<UserMenu />)
      expect(screen.getByText("Z")).toBeInTheDocument()
    })
  })
})
