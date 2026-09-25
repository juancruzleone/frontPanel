import { fireEvent, render, screen } from "@testing-library/react"
import { beforeAll, describe, expect, it, vi } from "vitest"
import i18n from "../../../../src/i18n"
import { RecentWorkOrders } from "../../../../src/features/home/components/RecentWorkOrders"
import type { RecentWorkOrderDto } from "../../../../src/features/home/types/homeTypes"

// Behavior tests: the dashboard CSS modules are mocked so jsdom can compute
// accessible names without resolving token-based font calculations.
vi.mock("../../../../src/features/home/styles/home.module.css", () => ({
  default: new Proxy({}, { get: (_target, key) => String(key) }),
}))

const orders: RecentWorkOrderDto[] = [
  { _id: "wo-1", titulo: "Revisar bomba", estado: "pendiente", fechaCreacion: "2026-08-20T10:00:00.000Z", instalacion: { company: "Planta Norte" } },
  { _id: "wo-2", titulo: "Cambio de filtro", estado: "asignada", instalacion: { company: "Bodega Sur" } },
]

const rowFor = (title: string): HTMLElement => {
  const cell = screen.getByText(title)
  const control = cell.closest("button")
  expect(control).not.toBeNull()
  return control as HTMLElement
}

describe("RecentWorkOrders row interaction", () => {
  beforeAll(async () => { await i18n.changeLanguage("es") })

  it("renders every order as a real button control, never a clickable container", () => {
    const { container } = render(<RecentWorkOrders workOrders={orders} onOpenDetail={vi.fn()} />)

    expect(screen.getAllByRole("button", { name: "Ver detalle" })).toHaveLength(2)
    expect(screen.getByRole("button", { name: "Ver detalle de Revisar bomba" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Ver detalle de Cambio de filtro" })).toBeInTheDocument()
    expect(container.querySelectorAll("li[role='button'], li[onclick]")).toHaveLength(0)
    expect(rowFor("Revisar bomba")).toHaveAttribute("type", "button")
    expect(rowFor("Cambio de filtro").closest("li")).toBe(rowFor("Revisar bomba").closest("li")?.parentElement?.children[1])
  })

  it("keeps status and creation date visible inside the row", () => {
    render(<RecentWorkOrders workOrders={orders} onOpenDetail={vi.fn()} />)
    const row = rowFor("Revisar bomba").closest("li")!

    expect(row.querySelector(".orderStatus")).toHaveTextContent("Pendiente")
    expect(row.querySelector("time")).toHaveAttribute("dateTime", "2026-08-20T10:00:00.000Z")
  })

  it("reports the activated order and the exact control that opened it", () => {
    const onOpenDetail = vi.fn()
    render(<RecentWorkOrders workOrders={orders} onOpenDetail={onOpenDetail} />)

    fireEvent.click(rowFor("Cambio de filtro"))
    expect(onOpenDetail).toHaveBeenCalledWith(orders[1], rowFor("Cambio de filtro"))

    const detailButton = screen.getAllByRole("button", { name: "Ver detalle" })[0]
    fireEvent.click(detailButton)
    expect(onOpenDetail).toHaveBeenLastCalledWith(orders[0], detailButton)
  })

  it("exposes a translated visible action in both shipped locales", async () => {
    render(<RecentWorkOrders workOrders={orders} onOpenDetail={vi.fn()} />)
    expect(screen.getAllByRole("button", { name: "Ver detalle" })).toHaveLength(2)

    await i18n.changeLanguage("en")
    expect(screen.getAllByRole("button", { name: "View details" })).toHaveLength(2)
    expect(screen.getByRole("button", { name: "View details for Revisar bomba" })).toBeInTheDocument()
    await i18n.changeLanguage("es")
  })

  it("still renders the empty state without controls", () => {
    render(<RecentWorkOrders workOrders={[]} onOpenDetail={vi.fn()} />)
    expect(screen.getByText("No hay órdenes recientes")).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})
