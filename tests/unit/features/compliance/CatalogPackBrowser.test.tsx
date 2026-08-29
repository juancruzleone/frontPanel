import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { I18nextProvider } from "react-i18next"
import { beforeEach, describe, expect, it, vi } from "vitest"
import i18n from "../../../../src/i18n"
import { CatalogPackBrowser } from "../../../../src/features/compliance/components/CatalogPackBrowser"
import { useComplianceCatalog } from "../../../../src/features/compliance/hooks/useComplianceCatalog"
import { useAuthStore } from "../../../../src/store/authStore"
import type { CatalogAssignment, CatalogPackDetail, CatalogPackSummary } from "../../../../src/features/compliance/services/complianceTypes"

vi.mock("../../../../src/features/compliance/hooks/useComplianceCatalog", () => ({ useComplianceCatalog: vi.fn() }))

const pack = (packKey: string): CatalogPackSummary => ({
  packKey, version: 1, state: "published", controlRefs: [{ controlKey: "temperature", version: 1 }],
  evaluatorRefs: [], rights: { author: "Leonix", rightsStatus: "original_operational_content" },
})
const detail: CatalogPackDetail = {
  ...pack("safety"),
  controls: [{ controlKey: "temperature", version: 1, scope: "asset", parameterDefinitions: [
    { key: "limit", type: "number", min: 0, max: 100 }, { key: "enabled", type: "boolean" },
  ] }], evaluators: [],
}
const active: CatalogAssignment = {
  assignmentKey: "safety:1", packKey: "safety", version: 1, status: "active", scope: "tenant",
  parameters: { limit: 50, enabled: true }, controlScopes: [],
}
const inactive: CatalogAssignment = { ...active, assignmentKey: "safety:old", status: "inactive" }

const renderBrowser = () => render(<I18nextProvider i18n={i18n}><CatalogPackBrowser /></I18nextProvider>)

const setupHook = (overrides: Record<string, unknown> = {}) => {
  const saveAssignment = vi.fn().mockResolvedValue(null)
  const value = {
    catalogPacks: { items: [pack("safety"), pack("backup")], page: 1, limit: 10, total: 2, totalPages: 1 },
    catalogPack: detail, assignments: [active, inactive], loading: false, error: null,
    loadPacks: vi.fn(), loadPack: vi.fn(), loadAssignments: vi.fn(), clearCatalogPack: vi.fn(), saveAssignment,
    ...overrides,
  }
  vi.mocked(useComplianceCatalog).mockReturnValue(value as ReturnType<typeof useComplianceCatalog>)
  return { saveAssignment, value }
}

describe("CatalogPackBrowser", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ role: "admin" })
  })

  it("loads packs, shows safe detail metadata, and displays the active assignment", () => {
    const { value } = setupHook()
    renderBrowser()
    fireEvent.click(screen.getAllByRole("button", { name: /Ver detalle/ })[0])
    expect(screen.getByText(/Contenido operativo original/)).toBeInTheDocument()
    expect(screen.getByText(/Asignación safety:1.*active.*tenant/)).toBeInTheDocument()
    expect(screen.getByText(/Asignación safety:old.*inactive/)).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite")
  })

  it("clears stale detail when switching packs until the new identity arrives", () => {
    const { value } = setupHook({ catalogPack: null })
    renderBrowser()
    fireEvent.click(screen.getAllByRole("button", { name: /Ver detalle/ })[0])
    expect(screen.getByText(/Cargando detalle|El detalle no está disponible/)).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole("button", { name: /Ver detalle/ })[1])
    expect(value.clearCatalogPack).toHaveBeenCalledTimes(2)
    expect(value.loadPack).toHaveBeenLastCalledWith("backup", 1)
    expect(screen.queryByText(/Controles publicados/)).not.toBeInTheDocument()
  })

  it("hands the exact assignment envelope to the existing mutation hook", async () => {
    const { saveAssignment } = setupHook()
    let resolveSave: (() => void) | undefined
    saveAssignment.mockImplementationOnce(() => new Promise<void>((resolve) => { resolveSave = resolve }))
    renderBrowser()
    fireEvent.click(screen.getAllByRole("button", { name: /Ver detalle/ })[0])
    fireEvent.change(screen.getByLabelText("limit"), { target: { value: "42" } })
    fireEvent.click(screen.getByLabelText("enabled"))
    fireEvent.click(screen.getByRole("button", { name: /Asignar pack/ }))
    await waitFor(() => expect(saveAssignment).toHaveBeenCalledWith({
      assignmentKey: "safety:1", packKey: "safety", version: 1,
      parameters: { limit: 42, enabled: true },
    }))
    expect(screen.getByRole("button", { name: /Guardando asignación/ })).toBeDisabled()
    resolveSave?.()
    await waitFor(() => expect(screen.getByRole("button", { name: /Asignar pack/ })).not.toBeDisabled())
  })

  it("shows catalog and assignments to technicians without mutation affordances", () => {
    setupHook()
    useAuthStore.setState({ role: "tecnico" })
    renderBrowser()
    fireEvent.click(screen.getAllByRole("button", { name: /Ver detalle/ })[0])
    expect(screen.getByText(/Asignación safety:1/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Asignar pack/ })).not.toBeInTheDocument()
  })

  it("renders explicit empty, list-error, and detail-error states with retry controls", () => {
    setupHook({ catalogPacks: { items: [], page: 1, limit: 10, total: 0, totalPages: 0 } })
    const { unmount } = renderBrowser()
    expect(screen.getByText(/No hay packs publicados/)).toBeInTheDocument()
    unmount()

    setupHook({ catalogPacks: null, error: "catalog.error" })
    renderBrowser()
    expect(screen.getByText(/catálogo no está disponible/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Reintentar/ })).toBeInTheDocument()
    unmount()

    setupHook({ catalogPack: null, error: "catalog.error" })
    renderBrowser()
    fireEvent.click(screen.getAllByRole("button", { name: /Ver detalle/ })[0])
    expect(screen.getByText(/detalle no está disponible/)).toBeInTheDocument()
  })

  it("consumes rejected initial, detail, and retry requests", async () => {
    const rejected = vi.fn().mockRejectedValue(new Error("network"))
    const unhandled = vi.fn()
    window.addEventListener("unhandledrejection", unhandled)
    const { unmount } = renderBrowserWithRejections(rejected)
    expect(screen.getByText(/catálogo no está disponible/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /Reintentar/ }))
    unmount()
    setupHook({ catalogPack: null, error: "catalog.error", loadPack: rejected })
    renderBrowser()
    fireEvent.click(screen.getAllByRole("button", { name: /Ver detalle/ })[0])
    await waitFor(() => expect(screen.getByText(/detalle no está disponible/)).toBeInTheDocument())
    await Promise.resolve()
    expect(unhandled).not.toHaveBeenCalled()
    window.removeEventListener("unhandledrejection", unhandled)
  })
})

const renderBrowserWithRejections = (rejected: ReturnType<typeof vi.fn>) => {
  setupHook({ catalogPacks: null, error: "catalog.error", loadPacks: rejected, loadAssignments: rejected })
  return renderBrowser()
}
