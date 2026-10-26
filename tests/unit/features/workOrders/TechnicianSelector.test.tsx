import { render, screen, fireEvent } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { TechnicianSelector } from "../../../../src/features/workOrders/components/TechnicianSelector"

const mockTechnicians = [
  { _id: "tech-1", userName: "juan.perez", fullName: "Juan Perez", role: "técnico" },
  { _id: "tech-2", userName: "maria.gomez", fullName: "Maria Gomez", role: "técnico" },
  { _id: "tech-3", userName: "carlos.lopez", fullName: "Carlos Lopez", role: "técnico" },
]

describe("TechnicianSelector UX/UI Component", () => {
  it("renders technicians with initials and handles search filtering", () => {
    const handleChange = vi.fn()
    render(
      <TechnicianSelector
        technicians={mockTechnicians}
        selectedTechnicianIds={[]}
        onChange={handleChange}
      />,
    )

    expect(screen.getByText("Juan Perez")).toBeInTheDocument()
    expect(screen.getByText("Maria Gomez")).toBeInTheDocument()
    expect(screen.getByText("Carlos Lopez")).toBeInTheDocument()

    // Type search
    const searchInput = screen.getByRole("textbox", { name: /buscar técnico/i })
    fireEvent.change(searchInput, { target: { value: "maria" } })

    expect(screen.getByText("Maria Gomez")).toBeInTheDocument()
    expect(screen.queryByText("Juan Perez")).not.toBeInTheDocument()
    expect(screen.queryByText("Carlos Lopez")).not.toBeInTheDocument()
  })

  it("selects and unselects technicians, displaying selected chips", () => {
    const handleChange = vi.fn()
    const { rerender } = render(
      <TechnicianSelector
        technicians={mockTechnicians}
        selectedTechnicianIds={["tech-1"]}
        onChange={handleChange}
      />,
    )

    // Displays chip for tech-1
    expect(screen.getByText("1 técnico seleccionado")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Quitar juan.perez" })).toBeInTheDocument()

    // Click item to toggle
    fireEvent.click(screen.getByText("Maria Gomez"))
    expect(handleChange).toHaveBeenCalledWith(["tech-1", "tech-2"])

    // Remove via chip
    rerender(
      <TechnicianSelector
        technicians={mockTechnicians}
        selectedTechnicianIds={["tech-1", "tech-2"]}
        onChange={handleChange}
      />,
    )

    expect(screen.getByText("2 técnicos seleccionados")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Quitar juan.perez" }))
    expect(handleChange).toHaveBeenCalledWith(["tech-2"])
  })

  it("clears all selections on Clear button click", () => {
    const handleChange = vi.fn()
    render(
      <TechnicianSelector
        technicians={mockTechnicians}
        selectedTechnicianIds={["tech-1", "tech-2"]}
        onChange={handleChange}
      />,
    )

    const clearBtn = screen.getByRole("button", { name: "Limpiar" })
    fireEvent.click(clearBtn)
    expect(handleChange).toHaveBeenCalledWith([])
  })

  it("shows empty state when search matches no technicians", () => {
    render(
      <TechnicianSelector
        technicians={mockTechnicians}
        selectedTechnicianIds={[]}
        onChange={vi.fn()}
      />,
    )

    const searchInput = screen.getByRole("textbox", { name: /buscar técnico/i })
    fireEvent.change(searchInput, { target: { value: "inexistente" } })

    expect(screen.getByText("No se encontraron técnicos para la búsqueda.")).toBeInTheDocument()
  })
})
