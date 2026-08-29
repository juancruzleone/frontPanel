import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { I18nextProvider } from "react-i18next"
import { describe, expect, it, vi } from "vitest"
import i18n from "../../../../src/i18n"
import {
  AssignmentParametersForm,
  validateAssignmentParameters,
} from "../../../../src/features/compliance/components/AssignmentParametersForm"
import type { CatalogParameterDefinition } from "../../../../src/features/compliance/services/complianceTypes"

const definitions: CatalogParameterDefinition[] = [
  { key: "limit", type: "number", min: 0, max: 100 },
  { key: "samples", type: "integer", min: 1, max: 5 },
  { key: "enabled", type: "boolean" },
  { key: "unit", type: "string" },
  { key: "mode", type: "string", allowed: ["strict", "relaxed"] },
]

const renderForm = (props: Partial<React.ComponentProps<typeof AssignmentParametersForm>> = {}) => render(
  <I18nextProvider i18n={i18n}>
    <AssignmentParametersForm definitions={definitions} canSubmit onSubmit={vi.fn().mockResolvedValue(undefined)} {...props} />
  </I18nextProvider>,
)

describe("AssignmentParametersForm", () => {
  it("sends an exact payload containing every declared parameter", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    renderForm({ onSubmit })
    fireEvent.change(screen.getByLabelText("limit"), { target: { value: "42" } })
    fireEvent.change(screen.getByLabelText("samples"), { target: { value: "3" } })
    fireEvent.click(screen.getByLabelText("enabled"))
    fireEvent.change(screen.getByLabelText("unit"), { target: { value: "celsius" } })
    fireEvent.change(screen.getByLabelText("mode"), { target: { value: "strict" } })
    fireEvent.click(screen.getByRole("button", { name: /Asignar pack/ }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({
      limit: 42, samples: 3, enabled: true, unit: "celsius", mode: "strict",
    }))
  })

  it("reports required, finite, integer, range, and allowed-value violations", () => {
    expect(validateAssignmentParameters(definitions, {})).toEqual({
      limit: "required", samples: "required", enabled: "required", unit: "required", mode: "required",
    })
    expect(validateAssignmentParameters(definitions, {
      limit: Number.NaN, samples: 1.5, enabled: false, unit: "x", mode: "other",
    })).toEqual({ limit: "invalid", samples: "invalid", mode: "invalid" })
    expect(validateAssignmentParameters(definitions, {
      limit: Number.POSITIVE_INFINITY, samples: 6, enabled: true, unit: "x", mode: "strict",
    })).toEqual({ limit: "invalid", samples: "invalid" })
  })

  it("blocks forbidden roles, pending submissions, and mutation errors", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    renderForm({ canSubmit: false, error: "mutationError", onSubmit })
    expect(screen.getAllByRole("alert").map((alert) => alert.textContent).join(" ")).toMatch(/permisos.*guardar/i)
    expect(screen.getByRole("button", { name: /Asignar pack/ })).toBeDisabled()
    fireEvent.submit(screen.getByRole("button", { name: /Asignar pack/ }).closest("form") as HTMLFormElement)
    expect(onSubmit).not.toHaveBeenCalled()

    renderForm({ pending: true })
    expect(screen.getByRole("button", { name: /Guardando asignación/ })).toBeDisabled()
  })

  it("locks duplicate clicks while the async callback is pending", async () => {
    let resolveSubmit: (() => void) | undefined
    const onSubmit = vi.fn().mockImplementation(() => new Promise<void>((resolve) => { resolveSubmit = resolve }))
    renderForm({ onSubmit })
    for (const [key, value] of [["limit", "42"], ["samples", "3"], ["unit", "x"]]) {
      fireEvent.change(screen.getByLabelText(key), { target: { value } })
    }
    fireEvent.click(screen.getByLabelText("enabled"))
    fireEvent.change(screen.getByLabelText("mode"), { target: { value: "strict" } })
    const submit = screen.getByRole("button", { name: /Asignar pack/ })
    fireEvent.click(submit)
    fireEvent.click(submit)
    expect(onSubmit).toHaveBeenCalledTimes(1)
    resolveSubmit?.()
    await waitFor(() => expect(submit).not.toBeDisabled())
  })
})
