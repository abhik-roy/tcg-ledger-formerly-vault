/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react"

// Mock next-auth/react
const mockSignIn = vi.fn()
vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}))

// Mock next/navigation
const mockPush = vi.fn()
const mockRefresh = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  useSearchParams: () => new URLSearchParams(),
}))

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

// The LoginForm is extracted inside the page — test it via the page which wraps in Suspense.
// We need to import after mocks are set up.
import ShopLoginPage from "@/app/shop/login/page"

describe("Shop Login Page", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders email and password fields", () => {
    render(<ShopLoginPage />)
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument()
  })

  it('renders email field with type="email"', () => {
    render(<ShopLoginPage />)
    const emailInput = screen.getByPlaceholderText("you@example.com")
    expect(emailInput).toHaveAttribute("type", "email")
  })

  it("renders a Sign In button", () => {
    render(<ShopLoginPage />)
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument()
  })

  it("has a link to /shop/register", () => {
    render(<ShopLoginPage />)
    const link = screen.getByRole("link", { name: /create one/i })
    expect(link).toHaveAttribute("href", "/shop/register")
  })

  it('calls signIn with email, password, and loginType: "customer"', async () => {
    mockSignIn.mockResolvedValue({ ok: true, error: null })
    render(<ShopLoginPage />)

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "test@example.com" },
    })
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "password123" },
    })

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /sign in/i }))
    })

    expect(mockSignIn).toHaveBeenCalledWith("credentials", {
      email: "test@example.com",
      password: "password123",
      loginType: "customer",
      redirect: false,
    })
  })

  it("does NOT call signIn with username key", async () => {
    mockSignIn.mockResolvedValue({ ok: true, error: null })
    render(<ShopLoginPage />)

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "test@example.com" },
    })
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "password123" },
    })

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /sign in/i }))
    })

    const callArgs = mockSignIn.mock.calls[0][1]
    expect(callArgs).not.toHaveProperty("username")
    expect(callArgs).toHaveProperty("email")
  })

  it("redirects to /shop on successful login with no callbackUrl", async () => {
    mockSignIn.mockResolvedValue({ ok: true, error: null })
    render(<ShopLoginPage />)

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "test@example.com" },
    })
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "password123" },
    })

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /sign in/i }))
    })

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/shop")
    })
  })

  it("shows error message on invalid credentials", async () => {
    mockSignIn.mockResolvedValue({ ok: false, error: "CredentialsSignin" })
    render(<ShopLoginPage />)

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "wrong@example.com" },
    })
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "wrongpassword" },
    })

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /sign in/i }))
    })

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument()
    })
  })

  it("shows error message when signIn throws", async () => {
    mockSignIn.mockRejectedValue(new Error("Network error"))
    render(<ShopLoginPage />)

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "test@example.com" },
    })
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "password123" },
    })

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /sign in/i }))
    })

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    })
  })

  it("disables the button while loading", async () => {
    // Never resolves so we can check the loading state
    mockSignIn.mockImplementation(() => new Promise(() => {}))
    render(<ShopLoginPage />)

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "test@example.com" },
    })
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "password123" },
    })

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /sign in/i }))
    })

    expect(screen.getByRole("button", { name: "" })).toBeDisabled()
  })
})
