import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router"
import ProtectedRoute from "../../../src/router/ProtectedRoute"
import RoleProtectedRoute from "../../../src/router/RoleProtectedRoute"
import { SETUP_PATH } from "../../../src/features/setup/setupPaths"
import { useAuthStore } from "../../../src/store/authStore"
import "../../../src/i18n"

const incompleteStatus = {
  status: "incomplete",
  version: 1,
  completedAt: null,
  checks: {
    company: true,
    installationTypes: false,
    deviceCategories: false,
    formCategories: false,
    maintenanceTemplate: false,
  },
  missing: ["installationTypes", "deviceCategories", "formCategories", "maintenanceTemplate"],
}

const completeStatus = {
  ...incompleteStatus,
  status: "complete",
  completedAt: "2026-01-01T00:00:00.000Z",
  checks: {
    company: true,
    installationTypes: true,
    deviceCategories: true,
    formCategories: true,
    maintenanceTemplate: true,
  },
  missing: [],
}

const jsonResponse = (body: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => "application/json" },
    json: async () => body,
  }) as unknown as Response

const loginAsAdmin = () =>
  useAuthStore.setState({
    accessMode: "full",
    isAuthResolved: true,
    isAuthenticated: true,
    user: "admin",
    userId: "admin-1",
    role: "admin",
  })

describe("onboarding access gate", () => {
  beforeEach(async () => {
    await useAuthStore.getState().logout()
    vi.clearAllMocks()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockReset()
  })

  it("redirige al setup cuando el tenant está incompleto", async () => {
    loginAsAdmin()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(incompleteStatus))
    render(
      <MemoryRouter initialEntries={["/inicio"]}>
        <Routes>
          <Route path={SETUP_PATH} element={<p>setup page</p>} />
          <Route path="/inicio" element={<ProtectedRoute><p>app content</p></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByText("setup page")).toBeInTheDocument()
    expect(screen.queryByText("app content")).not.toBeInTheDocument()
  })

  it("deja pasar cuando el tenant está completo", async () => {
    loginAsAdmin()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(completeStatus))
    render(
      <MemoryRouter initialEntries={["/inicio"]}>
        <Routes>
          <Route path={SETUP_PATH} element={<p>setup page</p>} />
          <Route path="/inicio" element={<ProtectedRoute><p>app content</p></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByText("app content")).toBeInTheDocument()
    expect(screen.queryByText("setup page")).not.toBeInTheDocument()
  })

  it("RoleProtectedRoute también redirige al setup cuando está incompleto", async () => {
    loginAsAdmin()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(incompleteStatus))
    render(
      <MemoryRouter initialEntries={["/instalaciones"]}>
        <Routes>
          <Route path={SETUP_PATH} element={<p>setup page</p>} />
          <Route
            path="/instalaciones"
            element={<RoleProtectedRoute section="instalaciones"><p>installations</p></RoleProtectedRoute>}
          />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByText("setup page")).toBeInTheDocument()
    expect(screen.queryByText("installations")).not.toBeInTheDocument()
  })

  it("la ruta de setup nunca se redirige a sí misma", async () => {
    loginAsAdmin()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(incompleteStatus))
    render(
      <MemoryRouter initialEntries={[SETUP_PATH]}>
        <Routes>
          <Route path={SETUP_PATH} element={<ProtectedRoute skipOnboarding><p>setup content</p></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByText("setup content")).toBeInTheDocument()
  })

  it("un fallo del estado muestra reintento y nunca concede acceso", async () => {
    loginAsAdmin()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("caído"))
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={["/inicio"]}>
        <Routes>
          <Route path={SETUP_PATH} element={<p>setup page</p>} />
          <Route path="/inicio" element={<ProtectedRoute><p>app content</p></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByRole("button", { name: /reintentar/i })).toBeInTheDocument()
    expect(screen.queryByText("app content")).not.toBeInTheDocument()
    expect(screen.queryByText("setup page")).not.toBeInTheDocument()

    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(completeStatus))
    await user.click(screen.getByRole("button", { name: /reintentar/i }))
    expect(await screen.findByText("app content")).toBeInTheDocument()
  })
})
