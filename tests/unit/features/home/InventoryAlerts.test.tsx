import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { beforeAll, describe, expect, it, vi } from "vitest"
import i18n from "../../../../src/i18n"
import type { InventorySummaryData } from "../../../../src/features/home/types/homeTypes"
import { InventorySummary } from "../../../../src/features/home/components/InventoryAlerts"

const item = (id: string, name: string, currentStock: number, minimumStock: number) => ({
  _id: id, name, currentStock, minimumStock, unit: "u",
})

const renderCard = (props: Partial<Parameters<typeof InventorySummary>[0]> = {}) => render(
  <MemoryRouter>
    <InventorySummary
      data={null}
      hasError={false}
      onRetry={vi.fn()}
      {...props}
    />
  </MemoryRouter>,
)

const withItems = (items: InventorySummaryData["items"], totalItems: number, lowStockItems: number): InventorySummaryData => ({
  totalItems, lowStockItems, items, lowStockDetails: items.filter((i) => i.currentStock <= i.minimumStock),
})

describe("InventorySummary low-content states", () => {
  beforeAll(async () => { await i18n.changeLanguage("es") })

  it("fills the card with real stock totals instead of leaving a blank area", () => {
    const { container } = renderCard({ data: withItems([item("a", "Filtro", 1, 2)], 20, 3) })
    const stats = Array.from(container.querySelectorAll("dl div")).map((row) => [
      row.querySelector("dt")?.textContent, row.querySelector("dd")?.textContent,
    ])
    expect(stats).toEqual([
      ["Total de ítems", "20"],
      ["Con stock bajo", "3"],
      ["Stock correcto", "17"],
    ])
    expect(screen.getByText("+19 ítems más en el inventario")).toBeInTheDocument()
    expect(screen.getByText("20 ítems · 3 con stock bajo")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ver todo el inventario" })).toHaveAttribute("href", "/inventario")
  })

  it("states the empty registry without hiding the route to it", () => {
    renderCard({ data: withItems([], 0, 0) })
    expect(screen.getByText("No hay artículos en inventario")).toBeInTheDocument()
    expect(screen.queryByText("Total de ítems")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ver todo el inventario" })).toBeInTheDocument()
  })

  it("keeps a not-loaded inventory distinguishable from an empty one", () => {
    renderCard({ data: null })
    expect(screen.getByText("No hay artículos en inventario")).toBeInTheDocument()
  })

  it("shows the totals alone when the API reports stock without item details", () => {
    const { container } = renderCard({ data: withItems([], 7, 2) })
    expect(screen.getByText("No hay artículos con detalle para mostrar.")).toBeInTheDocument()
    expect(screen.getByText("+7 ítems más en el inventario")).toBeInTheDocument()
    expect(container.querySelector("ul")).toBeNull()
    expect(screen.queryByText("No hay artículos en inventario")).not.toBeInTheDocument()
  })

  it("caps the visible list at five rows and counts the rest", () => {
    const many = withItems(
      [1, 2, 3, 4, 5, 6].map((n) => item(`id-${n}`, `Ítem ${n}`, 10, 1)),
      6, 0,
    )
    const { container } = renderCard({ data: many })
    expect(container.querySelectorAll("ul li")).toHaveLength(5)
    expect(screen.getByText("+1 ítems más en el inventario")).toBeInTheDocument()
    expect(screen.getByText("Stock correcto")).toBeInTheDocument()
    expect(screen.queryByText("Ítem 6")).not.toBeInTheDocument()
  })

  it("never reports more low-stock items than the card totals", () => {
    const { container } = renderCard({ data: withItems([item("a", "Filtro", 1, 2)], 2, 9) })
    const values = Array.from(container.querySelectorAll("dl dd")).map((dd) => dd.textContent)
    expect(values).toEqual(["2", "2", "0"])
  })

  it("translates the new strings in every other locale instead of falling back to Spanish", async () => {
    const expected: Record<string, string> = {
      en: "Healthy stock",
      fr: "Stock correct",
      de: "Bestand in Ordnung",
      it: "Stock corretto",
      pt: "Estoque correto",
      ja: "在庫正常",
      ko: "재고 정상",
      zh: "库存正常",
      ar: "مخزون سليم",
    }
    for (const [language, label] of Object.entries(expected)) {
      await i18n.changeLanguage(language)
      const { container, unmount } = renderCard({ data: withItems([item("a", "Filtro", 1, 2)], 4, 1) })
      expect(Array.from(container.querySelectorAll("dt")).map((dt) => dt.textContent)).toContain(label)
      unmount()
    }
    await i18n.changeLanguage("es")
  })
})
