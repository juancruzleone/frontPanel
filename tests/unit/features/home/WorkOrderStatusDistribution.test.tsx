import { render, screen } from "@testing-library/react"
import { beforeAll, describe, expect, it } from "vitest"
import i18n from "../../../../src/i18n"
import { WorkOrderStatusDistribution } from "../../../../src/features/home/components/WorkOrderStatusDistribution"

const rows = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("li")).map((row) => ({
    label: row.children[1].textContent,
    count: row.children[2].textContent,
    percentage: row.children[3].textContent,
  }))

describe("WorkOrderStatusDistribution", () => {
  beforeAll(async () => { await i18n.changeLanguage("es") })

  it("uses exact counts as segment widths and completes the status set with real zeros", () => {
    const { container } = render(<WorkOrderStatusDistribution data={[
      { name: "pending", value: 0 },
      { name: "assigned", value: 1 },
      { name: "completed", value: 99 },
    ]} />)
    const bar = container.querySelector("svg")!
    expect(bar).toHaveAttribute("viewBox", "0 0 100 1")
    expect(bar).toHaveAttribute("aria-hidden", "true")
    const segments = bar.querySelectorAll("rect")
    // Every canonical status is drawn, including the ones the API omitted, and
    // a zero count keeps zero width, so the bar never overstates a category.
    expect(Array.from(segments, (segment) => segment.getAttribute("width"))).toEqual(["0", "1", "0", "99", "0"])
    expect(Array.from(segments, (segment) => segment.getAttribute("x"))).toEqual(["0", "0", "1", "1", "100"])
    expect(rows(container)).toEqual([
      { label: "Pendiente", count: "0", percentage: "0%" },
      { label: "Asignada", count: "1", percentage: "1%" },
      { label: "En Progreso", count: "0", percentage: "0%" },
      { label: "Completada", count: "99", percentage: "99%" },
      { label: "Cancelada", count: "0", percentage: "0%" },
    ])
  })

  it("renders the full status list when the API only returns one busy status", () => {
    const { container } = render(<WorkOrderStatusDistribution data={[{ name: "Pendiente", value: 4 }]} />)
    expect(rows(container)).toEqual([
      { label: "Pendiente", count: "4", percentage: "100%" },
      { label: "Asignada", count: "0", percentage: "0%" },
      { label: "En Progreso", count: "0", percentage: "0%" },
      { label: "Completada", count: "0", percentage: "0%" },
      { label: "Cancelada", count: "0", percentage: "0%" },
    ])
    expect(screen.getByText("4 órdenes")).toBeInTheDocument()
    expect(screen.getByText("Órdenes por Estado")).toBeInTheDocument()
  })

  it("completes the priority set for technician mode", () => {
    const { container } = render(<WorkOrderStatusDistribution mode="priority" data={[{ name: "critica", value: 2 }]} />)
    expect(rows(container)).toEqual([
      { label: "Baja", count: "0", percentage: "0%" },
      { label: "Media", count: "0", percentage: "0%" },
      { label: "Alta", count: "0", percentage: "0%" },
      { label: "Crítica", count: "2", percentage: "100%" },
    ])
    expect(screen.getByText("Órdenes por Prioridad")).toBeInTheDocument()
  })

  it("keeps unexpected API categories visible after the canonical ones and merges duplicates", () => {
    const { container } = render(<WorkOrderStatusDistribution data={[
      { name: "on_hold", value: 3 },
      { name: "Pendiente", value: 1 },
      { name: "pendiente", value: 1 },
    ]} />)
    const rendered = rows(container)
    expect(rendered[0]).toEqual({ label: "Pendiente", count: "2", percentage: "40%" })
    expect(rendered.slice(1, 5).map((row) => row.count)).toEqual(["0", "0", "0", "0"])
    expect(rendered[5]).toEqual({ label: "on_hold", count: "3", percentage: "60%" })
    expect(screen.getByText("5 órdenes")).toBeInTheDocument()
  })

  it("translates the completed statuses in English", async () => {
    await i18n.changeLanguage("en")
    const { container } = render(<WorkOrderStatusDistribution data={[{ name: "pending", value: 1 }]} />)
    expect(rows(container).map((row) => row.label)).toEqual(["Pending", "Assigned", "In Progress", "Completed", "Cancelled"])
    await i18n.changeLanguage("es")
  })

  it("does not draw a misleading bar when all counts are zero", () => {
    const { container } = render(<WorkOrderStatusDistribution data={[{ name: "pending", value: 0 }]} />)
    expect(container.querySelector("svg")).toBeNull()
    expect(screen.getByText("No hay órdenes para distribuir en este periodo.")).toBeInTheDocument()
    expect(container.querySelectorAll("li")).toHaveLength(0)
  })
})
