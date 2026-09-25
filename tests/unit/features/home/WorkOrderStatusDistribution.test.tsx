import { render, screen } from "@testing-library/react"
import { beforeAll, describe, expect, it } from "vitest"
import i18n from "../../../../src/i18n"
import { WorkOrderStatusDistribution } from "../../../../src/features/home/components/WorkOrderStatusDistribution"

describe("WorkOrderStatusDistribution", () => {
  beforeAll(async () => { await i18n.changeLanguage("es") })

  it("uses exact counts as segment widths, including zero and sub-ten-percent values", () => {
    const { container } = render(<WorkOrderStatusDistribution data={[
      { name: "pending", value: 0 },
      { name: "assigned", value: 1 },
      { name: "completed", value: 99 },
    ]} />)
    const bar = container.querySelector("svg")!
    expect(bar).toHaveAttribute("viewBox", "0 0 100 1")
    expect(bar).toHaveAttribute("aria-hidden", "true")
    const segments = bar.querySelectorAll("rect")
    expect(Array.from(segments, (segment) => segment.getAttribute("width"))).toEqual(["0", "1", "99"])
    expect(Array.from(segments, (segment) => segment.getAttribute("x"))).toEqual(["0", "0", "1"])
    expect(screen.getByText("0%")).toBeInTheDocument()
    expect(screen.getByText("1%")).toBeInTheDocument()
    expect(screen.getByText("99%")).toBeInTheDocument()
  })

  it("does not draw a misleading bar when all counts are zero", () => {
    const { container } = render(<WorkOrderStatusDistribution data={[{ name: "pending", value: 0 }]} />)
    expect(container.querySelector("svg")).toBeNull()
    expect(screen.getByText("No hay órdenes para distribuir en este periodo.")).toBeInTheDocument()
  })
})
