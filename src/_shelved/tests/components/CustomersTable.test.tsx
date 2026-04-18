import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { CustomersTable } from "@/components/admin/CustomersTable"
import type { CustomerWithStats } from "@/app/actions/customers"

function makeCustomer(overrides: Partial<CustomerWithStats> = {}): CustomerWithStats {
  return {
    id: "cust-1",
    email: "jane@example.com",
    firstName: "Jane",
    lastName: "Doe",
    createdAt: new Date("2024-01-15"),
    orderCount: 3,
    lifetimeSpend: 4599, // $45.99
    ...overrides,
  }
}

describe("CustomersTable", () => {
  it("renders customer full name when firstName and lastName are set", () => {
    const customer = makeCustomer({ firstName: "Jane", lastName: "Doe" })
    render(<CustomersTable customers={[customer]} onSelectCustomer={vi.fn()} />)
    expect(screen.getByText("Jane Doe")).toBeInTheDocument()
  })

  it("renders email as primary display when name fields are null", () => {
    const customer = makeCustomer({ firstName: null, lastName: null })
    render(<CustomersTable customers={[customer]} onSelectCustomer={vi.fn()} />)
    // Email shown in name column
    const cells = screen.getAllByText("jane@example.com")
    expect(cells.length).toBeGreaterThan(0)
  })

  it("displays lifetime spend formatted as dollars", () => {
    const customer = makeCustomer({ lifetimeSpend: 1500 })
    render(<CustomersTable customers={[customer]} onSelectCustomer={vi.fn()} />)
    expect(screen.getByText("$15.00")).toBeInTheDocument()
  })

  it("displays $0.00 for customer with zero lifetime spend", () => {
    const customer = makeCustomer({ lifetimeSpend: 0 })
    render(<CustomersTable customers={[customer]} onSelectCustomer={vi.fn()} />)
    expect(screen.getByText("$0.00")).toBeInTheDocument()
  })

  it("shows empty state when customers array is empty", () => {
    render(<CustomersTable customers={[]} onSelectCustomer={vi.fn()} />)
    expect(screen.getByText("No customers found")).toBeInTheDocument()
  })

  it("calls onSelectCustomer with the correct customer when Details button clicked", () => {
    const onSelectCustomer = vi.fn()
    const customer = makeCustomer()
    render(<CustomersTable customers={[customer]} onSelectCustomer={onSelectCustomer} />)

    fireEvent.click(screen.getByText("Details →"))
    expect(onSelectCustomer).toHaveBeenCalledWith(customer)
  })

  it("calls onSelectCustomer when row is clicked", () => {
    const onSelectCustomer = vi.fn()
    const customer = makeCustomer()
    render(<CustomersTable customers={[customer]} onSelectCustomer={onSelectCustomer} />)

    fireEvent.click(screen.getByText("Jane Doe"))
    expect(onSelectCustomer).toHaveBeenCalledWith(customer)
  })

  it("applies selected row highlight when selectedCustomerId matches", () => {
    const customer = makeCustomer({ id: "selected-id" })
    const { container } = render(
      <CustomersTable
        customers={[customer]}
        onSelectCustomer={vi.fn()}
        selectedCustomerId="selected-id"
      />
    )
    const row = container.querySelector('tr[class*="bg-primary"]')
    expect(row).not.toBeNull()
  })

  it("renders order count badge", () => {
    const customer = makeCustomer({ orderCount: 7 })
    render(<CustomersTable customers={[customer]} onSelectCustomer={vi.fn()} />)
    expect(screen.getByText("7")).toBeInTheDocument()
  })

  it("renders initials avatar with first letters of name", () => {
    const customer = makeCustomer({ firstName: "Jane", lastName: "Doe" })
    render(<CustomersTable customers={[customer]} onSelectCustomer={vi.fn()} />)
    expect(screen.getByText("JD")).toBeInTheDocument()
  })

  it("renders initials from email when name is null", () => {
    const customer = makeCustomer({ firstName: null, lastName: null, email: "user@example.com" })
    render(<CustomersTable customers={[customer]} onSelectCustomer={vi.fn()} />)
    expect(screen.getByText("UE")).toBeInTheDocument()
  })

  it("renders multiple customers", () => {
    const customers = [
      makeCustomer({ id: "1", email: "a@x.com", firstName: "Alice", lastName: null }),
      makeCustomer({ id: "2", email: "b@x.com", firstName: "Bob", lastName: "Smith" }),
    ]
    render(<CustomersTable customers={customers} onSelectCustomer={vi.fn()} />)
    expect(screen.getByText("Alice")).toBeInTheDocument()
    expect(screen.getByText("Bob Smith")).toBeInTheDocument()
  })
})
