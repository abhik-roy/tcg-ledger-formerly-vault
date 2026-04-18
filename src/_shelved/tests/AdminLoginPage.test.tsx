/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react"

const mockSignIn = vi.fn()
const mockPush = vi.fn()

vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

import AdminLoginPage from "@/app/admin/login/page"

describe("Admin Login Page", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Helper: get the submit button (text varies by implementation)
  function getSubmitButton() {
    return screen.getByRole("button", { name: /access dashboard|sign in/i })
  }

  it("renders email and password fields", () => {
    render(<AdminLoginPage />)
    // Email input exists (find by type)
    expect(document.querySelector('input[type="email"]')).toBeInTheDocument()
    expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument()
  })

  it("renders a submit button", () => {
    render(<AdminLoginPage />)
    expect(getSubmitButton()).toBeInTheDocument()
  })

  it('calls signIn with loginType: "admin"', async () => {
    mockSignIn.mockResolvedValue({ ok: true, error: null })
    render(<AdminLoginPage />)

    fireEvent.change(document.querySelector('input[type="email"]')!, {
      target: { value: "admin@example.com" },
    })
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "adminpass" },
    })

    await act(async () => {
      fireEvent.click(getSubmitButton())
    })

    expect(mockSignIn).toHaveBeenCalledWith(
      "credentials",
      expect.objectContaining({
        email: "admin@example.com",
        password: "adminpass",
        loginType: "admin",
        redirect: false,
      })
    )
  })

  it('does NOT use loginType: "customer"', async () => {
    mockSignIn.mockResolvedValue({ ok: true, error: null })
    render(<AdminLoginPage />)

    fireEvent.change(document.querySelector('input[type="email"]')!, {
      target: { value: "admin@example.com" },
    })
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "adminpass" },
    })

    await act(async () => {
      fireEvent.click(getSubmitButton())
    })

    const callArgs = mockSignIn.mock.calls[0][1]
    expect(callArgs.loginType).toBe("admin")
    expect(callArgs.loginType).not.toBe("customer")
  })

  it("redirects to /admin/inventory after successful login with no callbackUrl", async () => {
    mockSignIn.mockResolvedValue({ ok: true, error: null })
    render(<AdminLoginPage />)

    fireEvent.change(document.querySelector('input[type="email"]')!, {
      target: { value: "admin@example.com" },
    })
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "adminpass" },
    })

    await act(async () => {
      fireEvent.click(getSubmitButton())
    })

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/admin/inventory")
    })
  })

  it("shows error on invalid credentials", async () => {
    mockSignIn.mockResolvedValue({ ok: false, error: "CredentialsSignin" })
    render(<AdminLoginPage />)

    fireEvent.change(document.querySelector('input[type="email"]')!, {
      target: { value: "wrong@example.com" },
    })
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "wrongpass" },
    })

    await act(async () => {
      fireEvent.click(getSubmitButton())
    })

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
  })
})
