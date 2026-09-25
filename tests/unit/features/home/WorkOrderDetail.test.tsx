import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import i18n from "../../../../src/i18n"
import type { WorkOrder } from "../../../../src/features/calendar/hooks/useCalendar"
import type { HomeDashboardState, RecentWorkOrderDto } from "../../../../src/features/home/types/homeTypes"
import { useWorkOrderDetail } from "../../../../src/features/home/hooks/useWorkOrderDetail"
import { mapDashboardStats } from "../../../../src/features/home/services/homeDashboardMapper"
import { createDashboardDto } from "./dashboardFixture"

vi.mock("../../../../src/features/home/styles/home.module.css", () => ({
  default: new Proxy({}, { get: (_target, key) => String(key) }),
}))
vi.mock("../../../../src/features/calendar/styles/Modal.module.css", () => ({
  default: new Proxy({}, { get: (_target, key) => String(key) }),
}))

const getWorkOrderById = vi.hoisted(() => vi.fn())
vi.mock("../../../../src/features/workOrders/services/workOrderServices", () => ({
  getWorkOrderById,
}))

const mocks = vi.hoisted(() => ({
  state: null as HomeDashboardState | null,
}))
vi.mock("../../../../src/features/home/hooks/useHomeDashboard", () => ({
  useHomeDashboard: () => mocks.state,
}))
vi.mock("../../../../src/features/home/hooks/useHomeTour", () => ({
  useHomeTour: () => ({ startTour: vi.fn(), tourCompleted: true }),
}))
vi.mock("../../../../src/store/authStore", () => ({
  useAuthStore: (selector: (state: { role: string | null; permissions: null }) => unknown) => selector({ role: "admin", permissions: null }),
}))

import { HomeDashboard } from "../../../../src/features/home/components/HomeDashboard"

const summaryOrder = (id: string, titulo: string): RecentWorkOrderDto => ({
  _id: id,
  titulo,
  estado: "pendiente",
  fechaCreacion: "2026-08-20T10:00:00.000Z",
  instalacion: { company: "Planta Norte" },
})

// Everything outside these fields is what the dashboard payload does not carry,
// so seeing it in the dialog proves the record was fetched by id.
const fullOrder = (id: string, titulo: string): WorkOrder => ({
  _id: id,
  titulo,
  descripcion: `Descripcion completa de ${titulo}`,
  instalacionId: "inst-1",
  instalacion: { _id: "inst-1", company: "Planta Norte", address: "Av. Siempre Verde 742", city: "Cordoba" },
  estado: "pendiente",
  prioridad: "alta",
  tipoTrabajo: "correctivo",
  fechaProgramada: "2026-08-21T09:30:00.000Z",
  horaProgramada: "09:30",
})

const stateWithOrders = (orders: RecentWorkOrderDto[]): HomeDashboardState => {
  const data = mapDashboardStats({ ...createDashboardDto("tenant"), recentWorkOrders: orders }, "admin", 2)
  return {
    data,
    inventory: { totalItems: 20, lowStockItems: 3, items: [], lowStockDetails: [] },
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

const rowControl = (titulo: string): HTMLElement => screen.getByText(titulo).closest("button") as HTMLElement
const visibleButton = (titulo: string): HTMLElement => {
  const row = screen.getByText(titulo).closest("li")!
  return Array.from(row.querySelectorAll("button")).find((button) => button.textContent === "Ver detalle") as HTMLElement
}
const dialogHeadings = () => screen.queryAllByRole("heading", { name: "Detalles de la Orden de Trabajo" })

describe("useWorkOrderDetail", () => {
  beforeAll(async () => { await i18n.changeLanguage("es") })
  beforeEach(() => { getWorkOrderById.mockReset() })

  it("loads the full record on demand and clears it on close", async () => {
    getWorkOrderById.mockResolvedValue(fullOrder("wo-1", "Revisar bomba"))
    const { result } = renderHook(() => useWorkOrderDetail())

    expect(result.current.workOrder).toBeNull()
    act(() => result.current.openWorkOrder(summaryOrder("wo-1", "Revisar bomba"), document.body))

    expect(result.current.status).toBe("loading")
    await waitFor(() => expect(result.current.status).toBe("ready"))
    expect(getWorkOrderById).toHaveBeenCalledWith("wo-1")
    expect(result.current.workOrder?.descripcion).toBe("Descripcion completa de Revisar bomba")

    act(() => result.current.closeWorkOrder())
    expect(result.current.workOrder).toBeNull()
    expect(result.current.activeId).toBeNull()
    expect(result.current.status).toBe("idle")
  })

  it("surfaces a failed load as an error and retries the same order", async () => {
    getWorkOrderById.mockRejectedValueOnce(new Error("WORK_ORDER_DETAIL_UNAVAILABLE"))
    const { result } = renderHook(() => useWorkOrderDetail())

    act(() => result.current.openWorkOrder(summaryOrder("wo-7", "Cambio de filtro"), document.body))
    await waitFor(() => expect(result.current.status).toBe("error"))
    expect(result.current.workOrder).toBeNull()

    getWorkOrderById.mockResolvedValueOnce(fullOrder("wo-7", "Cambio de filtro"))
    await act(async () => { result.current.retryWorkOrder() })
    expect(result.current.status).toBe("ready")
    expect(getWorkOrderById).toHaveBeenCalledTimes(2)
  })

  it("returns focus to the control that opened the dialog", () => {
    let resolveDetail!: (order: WorkOrder) => void
    getWorkOrderById.mockReturnValue(new Promise<WorkOrder>((resolve) => { resolveDetail = resolve }))
    const trigger = document.createElement("button")
    document.body.append(trigger)
    const { result } = renderHook(() => useWorkOrderDetail())

    trigger.focus()
    act(() => result.current.openWorkOrder(summaryOrder("wo-1", "Revisar bomba"), trigger))
    act(() => resolveDetail(fullOrder("wo-1", "Revisar bomba")))
    act(() => result.current.closeWorkOrder())

    expect(trigger).toHaveFocus()
    trigger.remove()
  })

  it("keeps one dialog slot by discarding a stale response", async () => {
    const first = fullOrder("wo-1", "Primera")
    const second = fullOrder("wo-2", "Segunda")
    getWorkOrderById
      .mockReturnValueOnce(new Promise<WorkOrder>((resolve) => { setTimeout(() => resolve(first), 40) }))
      .mockResolvedValueOnce(second)
    const { result } = renderHook(() => useWorkOrderDetail())

    act(() => result.current.openWorkOrder(summaryOrder("wo-1", "Primera"), document.body))
    act(() => result.current.openWorkOrder(summaryOrder("wo-2", "Segunda"), document.body))
    await waitFor(() => expect(result.current.status).toBe("ready"))

    expect(result.current.activeId).toBe("wo-2")
    expect(result.current.workOrder?.titulo).toBe("Segunda")
    await new Promise((resolve) => { setTimeout(resolve, 60) })
    expect(result.current.workOrder?.titulo).toBe("Segunda")
  })
})

describe("dashboard work order detail modal", () => {
  beforeAll(async () => { await i18n.changeLanguage("es") })
  beforeEach(() => {
    getWorkOrderById.mockReset()
    mocks.state = stateWithOrders([summaryOrder("wo-1", "Revisar bomba"), summaryOrder("wo-2", "Cambio de filtro")])
  })

  it("opens the shared modal with fetched detail without leaving the dashboard", async () => {
    getWorkOrderById.mockImplementation(async (id: string) => fullOrder(id, id === "wo-1" ? "Revisar bomba" : "Cambio de filtro"))
    render(<MemoryRouter><HomeDashboard /></MemoryRouter>)

    expect(dialogHeadings()).toHaveLength(0)
    fireEvent.click(rowControl("Revisar bomba"))
    expect(screen.getByText("Abriendo el detalle de la orden de trabajo…")).toBeInTheDocument()

    const heading = await screen.findByRole("heading", { name: "Detalles de la Orden de Trabajo" })
    const dialog = heading.closest(".backdrop")!
    expect(dialog).toBeInTheDocument()
    expect(withinText(dialog, "Descripcion completa de Revisar bomba")).toBeInTheDocument()
    expect(withinText(dialog, "Av. Siempre Verde 742, Cordoba")).toBeInTheDocument()
    expect(getWorkOrderById).toHaveBeenCalledWith("wo-1")
    expect(heading).toHaveAccessibleName("Detalles de la Orden de Trabajo")
  })

  it("keeps a single modal instance across sequential activations", async () => {
    getWorkOrderById.mockImplementation(async (id: string) => fullOrder(id, id === "wo-1" ? "Revisar bomba" : "Cambio de filtro"))
    render(<MemoryRouter><HomeDashboard /></MemoryRouter>)

    fireEvent.click(visibleButton("Revisar bomba"))
    await screen.findByRole("heading", { name: "Detalles de la Orden de Trabajo" })
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }))
    expect(screen.queryByRole("heading", { name: "Detalles de la Orden de Trabajo" })).not.toBeInTheDocument()

    fireEvent.click(rowControl("Cambio de filtro"))
    await screen.findByRole("heading", { name: "Detalles de la Orden de Trabajo" })
    expect(document.querySelectorAll(".backdrop")).toHaveLength(1)
    expect(screen.getAllByText("Descripcion completa de Cambio de filtro")).toHaveLength(1)
  })

  it("closes on Escape and restores focus to the row control", async () => {
    getWorkOrderById.mockResolvedValue(fullOrder("wo-1", "Revisar bomba"))
    render(<MemoryRouter><HomeDashboard /></MemoryRouter>)
    const row = rowControl("Revisar bomba")

    fireEvent.click(row)
    await screen.findByRole("heading", { name: "Detalles de la Orden de Trabajo" })
    expect(screen.getByRole("button", { name: "Cerrar" })).toHaveFocus()

    fireEvent.keyDown(document, { key: "Escape" })
    expect(screen.queryByRole("heading", { name: "Detalles de la Orden de Trabajo" })).not.toBeInTheDocument()
    expect(row).toHaveFocus()
    expect(screen.queryByText("Abriendo el detalle de la orden de trabajo…")).not.toBeInTheDocument()
  })

  it("restores focus to the visible detail button when closed with its own button", async () => {
    getWorkOrderById.mockResolvedValue(fullOrder("wo-2", "Cambio de filtro"))
    render(<MemoryRouter><HomeDashboard /></MemoryRouter>)
    const detailButton = visibleButton("Cambio de filtro")

    fireEvent.click(detailButton)
    await screen.findByRole("heading", { name: "Detalles de la Orden de Trabajo" })
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }))

    expect(detailButton).toHaveFocus()
  })

  it("reports a failed detail load in the panel and recovers through retry", async () => {
    getWorkOrderById.mockRejectedValueOnce(new Error("WORK_ORDER_DETAIL_UNAVAILABLE"))
    render(<MemoryRouter><HomeDashboard /></MemoryRouter>)

    fireEvent.click(rowControl("Revisar bomba"))
    expect(await screen.findByText(/No pudimos abrir el detalle de la orden de trabajo/)).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Detalles de la Orden de Trabajo" })).not.toBeInTheDocument()

    getWorkOrderById.mockResolvedValueOnce(fullOrder("wo-1", "Revisar bomba"))
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }))
    await screen.findByRole("heading", { name: "Detalles de la Orden de Trabajo" })
    expect(screen.queryByText(/No pudimos abrir el detalle/)).not.toBeInTheDocument()
  })
})

const withinText = (root: Element, text: string): HTMLElement => {
  const match = Array.from(root.querySelectorAll("p")).find((node) => node.textContent === text)
  return match ?? (root as unknown as HTMLElement)
}
