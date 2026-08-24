import { fireEvent, render, screen } from "@testing-library/react"
import { beforeAll, describe, expect, it, vi } from "vitest"
import i18n from "../../../../src/i18n"
import { RangeFilter } from "../../../../src/features/home/components/RangeFilter"

describe("RangeFilter", () => {
  beforeAll(async () => { await i18n.changeLanguage("es") })

  it("announces selection as a radio group and changes period", () => {
    const onChange = vi.fn()
    render(<RangeFilter current="30d" onChange={onChange} />)

    expect(screen.getByRole("radiogroup", { name: "Seleccionar periodo del análisis" })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "30 días" })).toHaveAttribute("aria-checked", "true")
    fireEvent.click(screen.getByRole("radio", { name: "90 días" }))
    expect(onChange).toHaveBeenCalledWith("90d")
  })

  it("supports arrow-key range selection", () => {
    const onChange = vi.fn()
    render(<RangeFilter current="30d" onChange={onChange} />)
    fireEvent.keyDown(screen.getByRole("radio", { name: "30 días" }), { key: "ArrowRight" })
    expect(onChange).toHaveBeenCalledWith("90d")
  })
})
