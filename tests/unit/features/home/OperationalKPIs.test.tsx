import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import i18n from "../../../../src/i18n"
import { OperationalKPIs } from "../../../../src/features/home/components/OperationalKPIs"
import { mapDashboardStats } from "../../../../src/features/home/services/homeDashboardMapper"
import type { DashboardMetric } from "../../../../src/features/home/types/homeTypes"
import { createDashboardDto } from "./dashboardFixture"

vi.mock("../../../../src/features/home/styles/home.module.css", () => ({
  default: new Proxy({}, { get: (_target, key) => String(key) }),
}))

describe("OperationalKPIs contextual detail", () => {
  beforeEach(async () => { await i18n.changeLanguage("es") })

  it("shows real percentage progress, hour definitions and count proportions without replacing exceptions", () => {
    const metrics = mapDashboardStats(createDashboardDto("tenant"), "admin").metrics
    render(<OperationalKPIs metrics={metrics} />)

    expect(screen.getByRole("progressbar", { name: "Cumplimiento preventivo" })).toHaveAttribute("value", "82")
    expect(screen.getByRole("progressbar", { name: "Cumplimiento SLA" })).toHaveAttribute("value", "91")
    for (const progress of screen.getAllByRole("progressbar")) expect(progress).toHaveAttribute("max", "100")
    expect(screen.getByText("Tiempo promedio dedicado a reparaciones.")).toBeInTheDocument()
    expect(screen.getByText("Tiempo promedio entre fallos.")).toBeInTheDocument()
    expect(screen.getByText("Tiempo promedio hasta la primera respuesta.")).toBeInTheDocument()
    expect(screen.getByText("5 de 12 órdenes")).toBeInTheDocument()
    expect(screen.getByText("2 de 12 órdenes").closest(".kpiCell")).toHaveClass("critical")
    expect(screen.getByText("1 de 12 órdenes").closest(".kpiCell")).toHaveClass("warning")
  })

  it.each([0, 100])("keeps %s percent determinate instead of inventing a target or a trend", (value) => {
    render(<OperationalKPIs metrics={[{ id: "slaRate", value, unit: "percent" }]} />)
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", String(value))
    expect(screen.getByText(`${value} %`)).toBeInTheDocument()
  })

  it.each([null, -1, 101, NaN])("does not draw progress for unavailable or invalid percentage %s", (value) => {
    render(<OperationalKPIs metrics={[{ id: "slaRate", value, unit: "percent" }]} />)
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument()
    if (value === null) expect(screen.getByText("N/D")).toBeInTheDocument()
  })

  it.each([undefined, 0, -1, 2, NaN, Infinity])("omits proportional context for missing or inconsistent total %s", (total) => {
    render(<OperationalKPIs metrics={[{ id: "openWorkOrders", value: 5, total }]} />)
    expect(screen.queryByText(/de .* órdenes/)).not.toBeInTheDocument()
  })

  it("shows a known zero count with a real positive denominator", () => {
    render(<OperationalKPIs metrics={[{ id: "openWorkOrders", value: 0, total: 12 }]} />)
    expect(screen.getByText("0 de 12 órdenes")).toBeInTheDocument()
  })

  it("does not assume a denominator when the API omits it", () => {
    const dto = createDashboardDto("tenant")
    Reflect.deleteProperty(dto.kpis, "workOrders")
    render(<OperationalKPIs metrics={mapDashboardStats(dto, "admin").metrics} />)
    expect(screen.queryByText(/de .* órdenes/)).not.toBeInTheDocument()
  })

  it("keeps definitions factual when an hour value is unavailable", () => {
    const metrics: DashboardMetric[] = [{ id: "responseTimeHours", value: null, unit: "hours" }]
    render(<OperationalKPIs metrics={metrics} />)
    expect(screen.getByText("N/D")).toBeInTheDocument()
    expect(screen.getByText("Tiempo promedio hasta la primera respuesta.")).toBeInTheDocument()
  })

  it("translates the new detail in English", async () => {
    await i18n.changeLanguage("en")
    render(<OperationalKPIs metrics={mapDashboardStats(createDashboardDto("tenant"), "admin").metrics} />)
    expect(screen.getByText("Average time spent on repairs.")).toBeInTheDocument()
    expect(screen.getByText("Average time between failures.")).toBeInTheDocument()
    expect(screen.getByText("Average time until the first response.")).toBeInTheDocument()
    expect(screen.getByText("5 of 12 work orders")).toBeInTheDocument()
    expect(screen.getByRole("progressbar", { name: "SLA compliance" })).toHaveAttribute("value", "91")
    await i18n.changeLanguage("es")
  })
})
