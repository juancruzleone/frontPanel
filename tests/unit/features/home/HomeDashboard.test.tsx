import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import i18n from "../../../../src/i18n"
import type { HomeDashboardState } from "../../../../src/features/home/types/homeTypes"
import { createDashboardDto } from "./dashboardFixture"
import { mapDashboardStats } from "../../../../src/features/home/services/homeDashboardMapper"

const mocks = vi.hoisted(() => ({
  state: null as HomeDashboardState | null,
  role: "admin" as string | null,
}))

vi.mock("../../../../src/features/home/hooks/useHomeDashboard", () => ({
  useHomeDashboard: () => mocks.state,
}))
vi.mock("../../../../src/features/home/hooks/useHomeTour", () => ({
  useHomeTour: () => ({ startTour: vi.fn(), tourCompleted: true }),
}))
vi.mock("../../../../src/store/authStore", () => ({
  useAuthStore: (selector: (state: { role: string | null; permissions: null }) => unknown) => selector({ role: mocks.role, permissions: null }),
}))
vi.mock("../../../../src/router/useTranslatedRoutes", () => ({
  useTranslatedRoutes: () => ({ getRoute: () => "/ordenes-trabajo" }),
}))
vi.mock("../../../../src/shared/components/Buttons/TourButton", () => ({
  default: ({ label }: { label: string }) => <button type="button" aria-label={label}>{label}</button>,
}))

import { HomeDashboard } from "../../../../src/features/home/components/HomeDashboard"

const createState = (role: "admin" | "technician" | "client"): HomeDashboardState => {
  const scope = role === "admin" ? "tenant" : role === "technician" ? "assigned_work" : "assigned_installations"
  return {
    data: mapDashboardStats(createDashboardDto(scope), role),
    inventory: role === "admin" ? { totalItems: 20, lowStockItems: 3 } : null,
    loading: false,
    refreshing: false,
    error: null,
    inventoryError: false,
    range: "30d",
    isOffline: false,
    isStale: false,
    setRange: vi.fn(),
    retry: vi.fn(),
  }
}

describe("HomeDashboard role-aware composition", () => {
  beforeAll(async () => { await i18n.changeLanguage("es") })
  beforeEach(() => { mocks.role = "admin"; mocks.state = createState("admin") })

  it("shows tenant resources and inventory only to admin", () => {
    render(<MemoryRouter><HomeDashboard /></MemoryRouter>)
    expect(screen.getByText("Control operativo")).toBeInTheDocument()
    expect(screen.getByText("Resumen de inventario")).toBeInTheDocument()
    expect(screen.getByText("Técnicos")).toBeInTheDocument()
  })

  it("shows only assigned priorities and personal context to technicians", () => {
    mocks.role = "tecnico"
    mocks.state = createState("technician")
    render(<MemoryRouter><HomeDashboard /></MemoryRouter>)
    expect(screen.getByText("Mi jornada operativa")).toBeInTheDocument()
    expect(screen.getByText("Órdenes por Prioridad")).toBeInTheDocument()
    expect(screen.queryByText("Resumen de inventario")).not.toBeInTheDocument()
    expect(screen.queryByText("Capacidad de la operación")).not.toBeInTheDocument()
  })

  it("shows all assigned-installation metrics without global inventory or staff", () => {
    mocks.role = "cliente"
    mocks.state = createState("client")
    render(<MemoryRouter><HomeDashboard /></MemoryRouter>)
    expect(screen.getByText("Estado de mis instalaciones")).toBeInTheDocument()
    expect(screen.getByText("Instalaciones y dispositivos asignados")).toBeInTheDocument()
    expect(screen.getByText("Dispositivos")).toBeInTheDocument()
    expect(screen.queryByText("Resumen de inventario")).not.toBeInTheDocument()
    expect(screen.queryByText("Técnicos")).not.toBeInTheDocument()
  })

  it("renders loading, retryable error, empty sections, and historical fallback", () => {
    mocks.state = { ...createState("admin"), data: null, loading: true }
    const { rerender } = render(<MemoryRouter><HomeDashboard /></MemoryRouter>)
    expect(screen.getByLabelText("Cargando panel")).toHaveAttribute("aria-busy", "true")

    mocks.state = { ...createState("admin"), data: null, error: "home.dashboard.errors.loadFailed" }
    rerender(<MemoryRouter><HomeDashboard /></MemoryRouter>)
    expect(screen.getByText("Reintentar")).toBeInTheDocument()

    const emptyState = createState("admin")
    emptyState.data = emptyState.data ? { ...emptyState.data, charts: { ...emptyState.data.charts, evolution: [], byStatus: [] }, metadata: { ...emptyState.data.metadata, fallbackApplied: true } } : null
    mocks.state = { ...emptyState, isOffline: true, isStale: true, inventoryError: true }
    rerender(<MemoryRouter><HomeDashboard /></MemoryRouter>)
    expect(screen.getByText("No hay evolución disponible para este periodo.")).toBeInTheDocument()
    expect(screen.getByText(/algunas visualizaciones usan histórico reciente/)).toBeInTheDocument()
    expect(screen.getByText(/últimos datos guardados/)).toBeInTheDocument()
    expect(screen.getByText(/pueden estar desactualizados/)).toBeInTheDocument()
    expect(screen.getByText(/resumen de inventario no está disponible/)).toBeInTheDocument()
  })

  it("hides the applied range data while a newly selected range is loading", () => {
    const appliedState = createState("admin")
    const { rerender } = render(<MemoryRouter><HomeDashboard /></MemoryRouter>)
    expect(screen.getByText("Revisar bomba")).toBeInTheDocument()

    mocks.state = { ...appliedState, range: "7d", loading: true, refreshing: true }
    rerender(<MemoryRouter><HomeDashboard /></MemoryRouter>)

    expect(screen.getByLabelText("Cargando panel")).toHaveAttribute("data-refreshing", "true")
    expect(screen.queryByText("Revisar bomba")).not.toBeInTheDocument()
  })

  it("renders invalid external dates with a safe fallback", () => {
    const state = createState("admin")
    if (state.data) {
      state.data.metadata.lastUpdate = "invalid-date"
      state.data.upcomingPreventive = [{ _id: "pm-invalid", installationName: "Planta Sur", date: "invalid-date", planName: "Inspección" }]
      state.data.recentWorkOrders[0].fechaCreacion = "invalid-date"
    }
    mocks.state = state

    expect(() => render(<MemoryRouter><HomeDashboard /></MemoryRouter>)).not.toThrow()
    expect(screen.getAllByText("Fecha no disponible")).toHaveLength(3)
  })

  it("keeps the tour action in the admin header only", () => {
    const { rerender } = render(<MemoryRouter><HomeDashboard /></MemoryRouter>)
    expect(screen.getByLabelText("Ver tutorial")).toBeInTheDocument()

    mocks.role = "tecnico"
    mocks.state = createState("technician")
    rerender(<MemoryRouter><HomeDashboard /></MemoryRouter>)
    expect(screen.queryByLabelText("Ver tutorial")).not.toBeInTheDocument()
  })

  it("provides the dashboard loading label in every configured locale", async () => {
    const labels = {
      ar: "جارٍ تحميل لوحة المعلومات",
      de: "Dashboard wird geladen",
      en: "Loading dashboard",
      es: "Cargando panel",
      fr: "Chargement du tableau de bord",
      it: "Caricamento dashboard",
      ja: "ダッシュボードを読み込み中",
      ko: "대시보드 로딩 중",
      pt: "Carregando painel",
      zh: "正在加载仪表板",
    }
    mocks.state = { ...createState("admin"), data: null, loading: true }
    const { rerender } = render(<MemoryRouter><HomeDashboard /></MemoryRouter>)

    for (const [language, label] of Object.entries(labels)) {
      await i18n.changeLanguage(language)
      rerender(<MemoryRouter><HomeDashboard /></MemoryRouter>)
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
    await i18n.changeLanguage("es")
  })
})
