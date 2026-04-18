import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, act } from "@testing-library/react"
import { CustomersClient } from "@/components/admin/CustomersClient"
import type { CustomerWithStats } from "@/app/actions/customers"

// CustomerOverviewStats may not be exported yet — define locally as a fallback
type CustomerOverviewStats = {
  totalCustomers: number
  totalRevenue: number // cents
  avgOrderValue: number // cents
}

// Mock next/navigation
const mockPush = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/admin/customers",
  useSearchParams: () => new URLSearchParams(),
}))

// Mock CustomerDetailPanel to avoid complex rendering
vi.mock("@/components/admin/CustomerDetailPanel", () => ({
  CustomerDetailPanel: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="detail-panel">
      <button onClick={onClose}>Close Panel</button>
    </div>
  ),
}))

function makeCustomer(id: string = "cust-1"): CustomerWithStats {
  return {
    id,
    email: `user-${id}@example.com`,
    firstName: "Test",
    lastName: "User",
    createdAt: new Date("2024-01-01"),
    orderCount: 2,
    lifetimeSpend: 5000,
  }
}

const defaultStats: CustomerOverviewStats = {
  totalCustomers: 42,
  totalRevenue: 125000,
  avgOrderValue: 2976,
}

const defaultProps = {
  initialData: [makeCustomer()],
  total: 1,
  totalPages: 1,
  currentPage: 1,
  stats: defaultStats,
}

describe("CustomersClient", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("renders total customer count in header", () => {
    render(<CustomersClient {...defaultProps} total={25} />)
    // Component renders "25" in a child span followed by " customers" text node
    expect(screen.getByText(/customers/)).toHaveTextContent("25 customers")
  })

  it("disables Previous button on page 1", () => {
    render(<CustomersClient {...defaultProps} currentPage={1} totalPages={3} />)
    const prevButton = screen.getByText("Prev").closest("button")!
    expect(prevButton).toBeDisabled()
  })

  it("disables Next button on last page", () => {
    render(<CustomersClient {...defaultProps} currentPage={3} totalPages={3} />)
    const nextButton = screen.getByText("Next").closest("button")!
    expect(nextButton).toBeDisabled()
  })

  it("calls router.push with next page when Next is clicked", () => {
    render(<CustomersClient {...defaultProps} currentPage={1} totalPages={3} />)
    fireEvent.click(screen.getByText("Next"))
    expect(mockPush).toHaveBeenCalledWith("/admin/customers?page=2")
  })

  it("calls router.push with prev page when Prev is clicked", () => {
    render(<CustomersClient {...defaultProps} currentPage={2} totalPages={3} />)
    fireEvent.click(screen.getByText("Prev"))
    expect(mockPush).toHaveBeenCalledWith("/admin/customers?page=1")
  })

  it("debounces search input and calls router.push with q param after 400ms", async () => {
    render(<CustomersClient {...defaultProps} />)
    const searchInput = screen.getByPlaceholderText("Search by name or email…")

    fireEvent.change(searchInput, { target: { value: "jane" } })
    expect(mockPush).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(mockPush).toHaveBeenCalledWith("/admin/customers?q=jane&page=1")
  })

  it("does not push before debounce delay completes", () => {
    render(<CustomersClient {...defaultProps} />)
    const searchInput = screen.getByPlaceholderText("Search by name or email…")

    fireEvent.change(searchInput, { target: { value: "test" } })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it("removes q param when search is cleared", async () => {
    render(<CustomersClient {...defaultProps} />)
    const searchInput = screen.getByPlaceholderText("Search by name or email…")

    // First set a search value
    fireEvent.change(searchInput, { target: { value: "jane" } })
    act(() => {
      vi.advanceTimersByTime(400)
    })

    // Then clear it
    vi.clearAllMocks()
    fireEvent.change(searchInput, { target: { value: "" } })
    act(() => {
      vi.advanceTimersByTime(400)
    })

    // Should push without q param
    const lastCall = mockPush.mock.calls[mockPush.mock.calls.length - 1]?.[0] ?? ""
    expect(lastCall).not.toContain("q=")
  })

  it("shows the detail panel when a customer is selected", () => {
    render(<CustomersClient {...defaultProps} />)
    expect(screen.queryByTestId("detail-panel")).toBeNull()

    fireEvent.click(screen.getByText("Test User"))
    expect(screen.getByTestId("detail-panel")).toBeInTheDocument()
  })

  it("hides the detail panel when it is closed", () => {
    render(<CustomersClient {...defaultProps} />)
    fireEvent.click(screen.getByText("Test User"))
    expect(screen.getByTestId("detail-panel")).toBeInTheDocument()

    fireEvent.click(screen.getByText("Close Panel"))
    expect(screen.queryByTestId("detail-panel")).toBeNull()
  })

  it("displays page info text", () => {
    render(<CustomersClient {...defaultProps} currentPage={2} totalPages={5} total={100} />)
    expect(screen.getByText("2 / 5")).toBeInTheDocument()
  })

  it("enables Next button when not on last page", () => {
    render(<CustomersClient {...defaultProps} currentPage={1} totalPages={3} />)
    const nextButton = screen.getByText("Next").closest("button")!
    expect(nextButton).not.toBeDisabled()
  })

  it("enables Previous button when not on first page", () => {
    render(<CustomersClient {...defaultProps} currentPage={2} totalPages={3} />)
    const prevButton = screen.getByText("Prev").closest("button")!
    expect(prevButton).not.toBeDisabled()
  })

  it("renders the search input field", () => {
    render(<CustomersClient {...defaultProps} />)
    expect(screen.getByPlaceholderText("Search by name or email…")).toBeInTheDocument()
  })
})
