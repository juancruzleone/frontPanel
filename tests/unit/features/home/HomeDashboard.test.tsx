import { fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import i18n from "../../../../src/i18n"
import type { HomeDashboardState } from "../../../../src/features/home/types/homeTypes"
import { createDashboardDto } from "./dashboardFixture"
import { mapDashboardStats } from "../../../../src/features/home/services/homeDashboardMapper"
import TourButton from "../../../../src/shared/components/Buttons/TourButton"

// These are behavior tests. jsdom cannot resolve the dashboard's token-based
// font calculations when Testing Library computes accessible roles.
vi.mock("../../../../src/features/home/styles/home.module.css", () => ({
  default: new Proxy({}, { get: (_target, key) => String(key) }),
}))

const mocks = vi.hoisted(() => ({
  state: null as HomeDashboardState | null,
  role: "admin" as string | null,
  startTour: vi.fn(),
}))

vi.mock("../../../../src/features/home/hooks/useHomeDashboard", () => ({
  useHomeDashboard: () => mocks.state,
}))
vi.mock("../../../../src/features/home/hooks/useHomeTour", () => ({
  useHomeTour: () => ({ startTour: mocks.startTour, tourCompleted: true }),
}))
vi.mock("../../../../src/store/authStore", () => ({
  useAuthStore: (selector: (state: { role: string | null; permissions: null }) => unknown) => selector({ role: mocks.role, permissions: null }),
}))

import { HomeDashboard } from "../../../../src/features/home/components/HomeDashboard"

const createState = (role: "admin" | "technician" | "client"): HomeDashboardState => {
  const scope = role === "admin" ? "tenant" : role === "technician" ? "assigned_work" : "assigned_installations"
  return {
    data: mapDashboardStats(createDashboardDto(scope), role, role === "admin" ? 6 : undefined),
    inventory: role === "admin" ? { totalItems: 20, lowStockItems: 3, items: [{ _id: "item-1", name: "Filtro", currentStock: 1, minimumStock: 2, unit: "u" }], lowStockDetails: [] } : null,
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
  beforeEach(() => { mocks.role = "admin"; mocks.state = createState("admin"); mocks.startTour.mockClear() })

  it("shows tenant resources and inventory only to admin", () => {
    render(<MemoryRouter><HomeDashboard /></MemoryRouter>)
    expect(screen.getByText("Control operativo")).toBeInTheDocument()
    expect(screen.getByText("Resumen de inventario")).toBeInTheDocument()
    expect(screen.getByText("Técnicos")).toBeInTheDocument()
  })

  it("links only resource titles inside terms with translated accessible names and routes", async () => {
    const { rerender } = render(<MemoryRouter><HomeDashboard /></MemoryRouter>)
    const cases = [
      { language: "es", title: "Capacidad de la operación", links: [["Instalaciones", "/instalaciones"], ["Activos", "/activos"], ["Técnicos", "/personal"], ["Clientes", "/clientes"]] },
      { language: "en", title: "Operational capacity", links: [["Installations", "/installations"], ["Assets", "/assets"], ["Technicians", "/staff"], ["Clients", "/clients"]] },
    ]
    for (const { language, title, links } of cases) {
      await i18n.changeLanguage(language)
      rerender(<MemoryRouter><HomeDashboard /></MemoryRouter>)
      const band = screen.getByRole("region", { name: title })
      expect(within(band).getAllByRole("link")).toHaveLength(4)
      for (const [name, href] of links) {
        const link = within(band).getByRole("link", { name })
        expect(link).toHaveAttribute("href", href)
        expect(link.parentElement?.tagName).toBe("DT")
        expect(link.parentElement?.parentElement?.parentElement?.tagName).toBe("DL")
        const value = link.parentElement?.nextElementSibling
        expect(value?.tagName).toBe("DD")
        expect(value?.textContent).toMatch(/^\d+$/)
        expect(value?.querySelector("a, button, [tabindex]")).toBeNull()
        link.focus()
        expect(link).toHaveFocus()
      }
    }
    await i18n.changeLanguage("es")
  })

  it("keeps devices non-interactive while linking assigned installations", () => {
    mocks.role = "cliente"
    mocks.state = createState("client")
    render(<MemoryRouter><HomeDashboard /></MemoryRouter>)
    const band = screen.getByRole("region", { name: "Instalaciones y dispositivos asignados" })
    expect(within(band).getAllByRole("link")).toHaveLength(1)
    expect(within(band).getByRole("link", { name: "Instalaciones" })).toHaveAttribute("href", "/instalaciones")
    const devices = within(band).getByText("Dispositivos").parentElement!
    expect(devices.querySelector("a, button, [tabindex]")).toBeNull()
    expect(within(band).queryByText("Clientes")).not.toBeInTheDocument()
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

  it.each([
    ["admin", "admin", 4],
    ["cliente", "client", 2],
    ["tecnico", "technician", 0],
    ["técnico", "technician", 0],
  ] as const)("mirrors loaded section order and role-specific resources while loading %s", (rawRole, role, resourceCount) => {
    mocks.role = rawRole
    const loadedState = createState(role)
    mocks.state = { ...loadedState, data: null, loading: true }
    const { container, rerender } = render(<MemoryRouter><HomeDashboard /></MemoryRouter>)
    const skeleton = screen.getByLabelText("Cargando panel")
    const sectionOrder = (root: Element) => Array.from(root.children)
      .filter((child) => child.tagName === "SECTION")
      .map((child) => child.getAttribute("aria-labelledby"))
    const expectedSections = ["attention-overview-title", ...(resourceCount ? ["resources-title"] : []), "analysis-title", "recent-title"]

    expect(sectionOrder(skeleton)).toEqual(expectedSections)
    expect(skeleton.querySelector("header h1")).toHaveTextContent(i18n.t(`home.dashboard.roles.${role}.title`))
    expect(within(skeleton).getAllByRole("radio")).toHaveLength(4)
    expect(skeleton.querySelector(".refreshStatus")).toBeInTheDocument()
    expect(skeleton.querySelector(".attentionGrid")?.children).toHaveLength(2)
    expect(skeleton.querySelectorAll(".kpiCell")).toHaveLength(8)
    expect(skeleton.querySelector(".attentionGrid > .attentionPanel")).toHaveClass("skeletonAttention")
    expect(skeleton.querySelectorAll(".resourceBand dl > div")).toHaveLength(resourceCount)
    expect(skeleton.querySelector(".analysisGrid")?.children).toHaveLength(2)
    expect(skeleton.querySelector(".workGrid")?.children).toHaveLength(2)
    expect(skeleton).toHaveAttribute("data-refreshing", "false")

    mocks.state = loadedState
    rerender(<MemoryRouter><HomeDashboard /></MemoryRouter>)
    const loaded = container.querySelector(".dashboardContainer")!
    expect(sectionOrder(loaded)).toEqual(expectedSections)
    expect(loaded.querySelector(".attentionGrid")?.children).toHaveLength(2)
    expect(loaded.querySelectorAll(".kpiCell")).toHaveLength(8)
    expect(loaded.querySelectorAll(".resourceBand dl > div")).toHaveLength(resourceCount)
    expect(screen.queryByLabelText("Cargando panel")).not.toBeInTheDocument()
  })

  it("places known loading notices between the refresh slot and attention section", () => {
    mocks.state = { ...createState("admin"), data: null, loading: true, isOffline: true, isStale: true }
    const { rerender } = render(<MemoryRouter><HomeDashboard /></MemoryRouter>)
    const skeleton = screen.getByLabelText("Cargando panel")
    const notices = skeleton.querySelector(".dataNotices")!
    expect(notices.children).toHaveLength(2)
    expect(notices.previousElementSibling).toHaveClass("refreshStatus")
    expect(notices.nextElementSibling).toHaveAttribute("aria-labelledby", "attention-overview-title")

    mocks.state = { ...mocks.state, isOffline: false, isStale: false }
    rerender(<MemoryRouter><HomeDashboard /></MemoryRouter>)
    expect(skeleton.querySelector(".dataNotices")).not.toBeInTheDocument()
  })

  it("keeps content and keyboard focus mounted throughout a range refresh", () => {
    const appliedState = mocks.state!
    const { rerender } = render(<MemoryRouter><HomeDashboard /></MemoryRouter>)
    const order = screen.getByText("Revisar bomba")
    const selected = screen.getByRole("radio", { checked: true })
    selected.focus()
    fireEvent.keyDown(selected, { key: "ArrowLeft" })
    expect(appliedState.setRange).toHaveBeenCalledWith("7d")
    const next = screen.getAllByRole("radio")[0]
    expect(next).toHaveFocus()

    mocks.state = { ...appliedState, range: "7d", loading: true, refreshing: true }
    rerender(<MemoryRouter><HomeDashboard /></MemoryRouter>)

    expect(next).toHaveFocus()
    expect(next).toHaveAttribute("aria-checked", "true")
    expect(screen.getByText("Revisar bomba")).toBe(order)
    expect(order.closest(".dashboardContainer")).toHaveAttribute("aria-busy", "true")
    expect(order.closest(".dashboardContainer")).toHaveAttribute("data-refreshing", "true")
    expect(screen.getByRole("status")).toHaveTextContent("Actualizando")
    expect(screen.getByRole("status")).toHaveTextContent("30")
    expect(screen.queryByLabelText("Cargando panel")).not.toBeInTheDocument()

    mocks.state = { ...mocks.state, loading: false, refreshing: false }
    rerender(<MemoryRouter><HomeDashboard /></MemoryRouter>)
    expect(next).toHaveFocus()
    expect(screen.getByRole("status")).toBeEmptyDOMElement()
    expect(order.closest(".dashboardContainer")).toHaveAttribute("aria-busy", "false")
    expect(order.closest(".dashboardContainer")).toHaveAttribute("data-refreshing", "false")
  })

  it("links only routable records and uses translated installation and inventory routes", async () => {
    const { rerender } = render(<MemoryRouter><HomeDashboard /></MemoryRouter>)
    expect(screen.getByRole("link", { name: /Planta Norte\s*4/ })).toHaveAttribute("href", "/instalaciones/inst-1")
    expect(screen.getByRole("link", { name: /Filtro/ })).toHaveAttribute("href", "/inventario")
    expect(screen.getByText("Revisar bomba").closest("a")).toBeNull()
    // Recent orders are actionable: the row is a real button that opens the
    // shared detail dialog, never a link or a click handler on a div.
    const orderRow = screen.getByText("Revisar bomba").closest("button")!
    expect(orderRow).toHaveAttribute("type", "button")
    expect(orderRow).toHaveAccessibleName("Ver detalle de Revisar bomba")
    const upcoming = screen.getByText("Próximos Preventivos").parentElement!
    expect(within(upcoming).queryByRole("link")).not.toBeInTheDocument()

    await i18n.changeLanguage("en")
    rerender(<MemoryRouter><HomeDashboard /></MemoryRouter>)
    expect(screen.getByRole("link", { name: /Planta Norte\s*4/ })).toHaveAttribute("href", "/installations/inst-1")
    expect(screen.getByRole("link", { name: /Filtro/ })).toHaveAttribute("href", "/inventory")
    await i18n.changeLanguage("es")
  })

  it("distinguishes inventory failure from empty and offers a retry without replacing the panel", () => {
    mocks.state = { ...createState("admin"), inventory: null, inventoryError: true }
    const { rerender } = render(<MemoryRouter><HomeDashboard /></MemoryRouter>)
    expect(screen.getByRole("alert")).toHaveTextContent("resumen de inventario no está disponible")
    expect(screen.queryByText("No hay artículos en inventario")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }))
    expect(mocks.state.retry).toHaveBeenCalledOnce()
    mocks.state = { ...mocks.state, loading: true, refreshing: true }
    rerender(<MemoryRouter><HomeDashboard /></MemoryRouter>)
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeDisabled()
    expect(screen.getByText("Revisar bomba")).toBeInTheDocument()
  })

  it("shows a single no-data treatment when the scope has nothing loaded", () => {
    const blank = createState("admin")
    if (blank.data) {
      blank.data = {
        ...blank.data,
        metrics: blank.data.metrics.map((metric) => ({ ...metric, value: null, total: undefined })),
        charts: { byStatus: [], byType: [], byPriority: [], preventiveVsCorrective: [], deviceHealth: [], evolution: [] },
        recentWorkOrders: [],
        topIncidentInstallations: [],
        upcomingPreventive: [],
        resourceMetrics: [],
      }
    }
    blank.inventory = { totalItems: 0, lowStockItems: 0, items: [], lowStockDetails: [] }
    mocks.state = blank

    const { rerender } = render(<MemoryRouter><HomeDashboard /></MemoryRouter>)
    expect(screen.getByText("Aún no hay datos cargados para mostrar en el panel.")).toBeInTheDocument()
    expect(screen.getByText("Cuando haya órdenes de trabajo, activos o inventario en tu alcance, los indicadores se completarán automáticamente.")).toBeInTheDocument()
    expect(screen.getByText("Aún no hay métricas operativas disponibles.")).toBeInTheDocument()
    // The panels keep their own specific empty states; the notice is the only
    // account-wide message.
    expect(screen.getAllByText("No hay artículos en inventario")).toHaveLength(1)

    mocks.state = createState("admin")
    rerender(<MemoryRouter><HomeDashboard /></MemoryRouter>)
    expect(screen.queryByText(/Aún no hay datos cargados/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Aún no hay métricas operativas/)).not.toBeInTheDocument()
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

  it("uses the shared floating tour action outside the header and preserves its callback", () => {
    render(<MemoryRouter><HomeDashboard /></MemoryRouter>)
    const homeButton = screen.getByLabelText("Ver tutorial")
    render(<TourButton onClick={vi.fn()} label="Section tutorial" />)
    const sectionButton = screen.getByLabelText("Section tutorial")

    expect(homeButton.className).toBe(sectionButton.className)
    expect(homeButton.closest("header")).toBeNull()
    expect(homeButton).toHaveAttribute("title", "Ver tutorial")
    expect(homeButton).toHaveAttribute("type", "button")
    expect(homeButton).toHaveTextContent("")
    expect(homeButton.querySelector("svg")).toHaveAttribute("width", "22")
    fireEvent.click(homeButton)
    expect(mocks.startTour).toHaveBeenCalledOnce()
  })

  it.each(["technician", "client"] as const)("hides the tour action for %s", (role) => {
    mocks.role = role === "technician" ? "tecnico" : "cliente"
    mocks.state = createState(role)
    render(<MemoryRouter><HomeDashboard /></MemoryRouter>)
    expect(screen.queryByLabelText("Ver tutorial")).not.toBeInTheDocument()
  })

  it("retains the admin floating action during initial loading", () => {
    mocks.state = { ...createState("admin"), data: null, loading: true }
    render(<MemoryRouter><HomeDashboard /></MemoryRouter>)
    const button = screen.getByLabelText("Ver tutorial")
    expect(button.closest("header")).toBeNull()
    fireEvent.click(button)
    expect(mocks.startTour).toHaveBeenCalledOnce()
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
