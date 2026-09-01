import { beforeEach, describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { BillingRoute } from "../../../src/router/BillingRoute"
import ProtectedRoute from "../../../src/router/ProtectedRoute"
import { useAuthStore } from "../../../src/store/authStore"
import "../../../src/i18n"

describe("billing route guards", () => {
  beforeEach(() => useAuthStore.getState().logout())

  it("allows billing-only sessions into billing and blocks the normal app", () => {
    useAuthStore.setState({ accessMode: "billing_only", isAuthResolved: true, isAuthenticated: false })
    const { rerender } = render(
      <MemoryRouter initialEntries={["/billing"]}>
        <Routes>
          <Route path="/" element={<p>login</p>} />
          <Route path="/billing" element={<BillingRoute><p>billing</p></BillingRoute>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText("billing")).toBeInTheDocument()

    rerender(
      <MemoryRouter initialEntries={["/app"]}>
        <Routes>
          <Route path="/billing" element={<p>billing redirect</p>} />
          <Route path="/app" element={<ProtectedRoute><p>app</p></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText("billing redirect")).toBeInTheDocument()
    expect(screen.queryByText("app")).not.toBeInTheDocument()
  })

  it("allows a full administrator into billing but blocks non-super-admin tenant management", () => {
    useAuthStore.setState({
      accessMode: "full",
      isAuthResolved: true,
      isAuthenticated: true,
      user: "admin",
      userId: "admin-1",
      role: "admin",
    })
    const { unmount } = render(
      <MemoryRouter initialEntries={["/billing"]}>
        <Routes><Route path="/billing" element={<BillingRoute><p>billing admin</p></BillingRoute>} /></Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText("billing admin")).toBeInTheDocument()
    unmount()

    render(
      <MemoryRouter initialEntries={["/tenants"]}>
        <Routes>
          <Route path="/inicio" element={<p>home redirect</p>} />
          <Route path="/home" element={<p>home redirect</p>} />
          <Route path="/tenants" element={<ProtectedRoute allowedRoles={["super_admin"]}><p>tenant management</p></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText("home redirect")).toBeInTheDocument()
    expect(screen.queryByText("tenant management")).not.toBeInTheDocument()
  })
})
