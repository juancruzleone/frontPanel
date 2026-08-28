import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import Installations from "../../../src/pages/Installations"
import useInstallations from "../../../src/features/installations/hooks/useInstallations"
import useCategories from "../../../src/features/installations/hooks/useCategories"
import useInstallationTypes from "../../../src/features/installations/hooks/useInstallationTypes"
import { useMaintenanceRequests } from "../../../src/features/maintenanceRequests/hooks/useMaintenanceRequests"
import { useAuthStore } from "../../../src/store/authStore"
import installationStyles from "../../../src/features/installations/styles/installations.module.css"
import buttonStyles from "../../../src/shared/components/Buttons/buttons.module.css"

const csvServices = vi.hoisted(() => ({
  exportInstallations: vi.fn(),
  downloadInstallationTemplate: vi.fn(),
  previewInstallationImport: vi.fn(),
  commitInstallationImport: vi.fn(),
  downloadInstallationImportErrors: vi.fn(),
}))

vi.mock("../../../src/features/installations/hooks/useInstallations")
vi.mock("../../../src/features/installations/hooks/useCategories")
vi.mock("../../../src/features/installations/hooks/useInstallationTypes")
vi.mock("../../../src/features/maintenanceRequests/hooks/useMaintenanceRequests")
vi.mock("../../../src/store/authStore")
vi.mock("../../../src/features/installations/services/installationServices", () => csvServices)
vi.mock("../../../src/features/installations/hooks/useInstallationsTour", () => ({ useInstallationsTour: () => ({ tourCompleted: true, startTour: vi.fn(), skipTour: vi.fn() }) }))
vi.mock("../../../src/shared/hooks/useResponsiveView", () => ({ useResponsiveView: () => ["cards", vi.fn(), false] }))
vi.mock("../../../src/shared/hooks/useTheme", () => ({ useTheme: () => ({ theme: "light" }) }))
vi.mock("react-router", () => ({ useNavigate: () => vi.fn() }))
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }) }))
vi.mock("../../../src/features/installations/components/ModalCreate", () => ({ default: () => null }))
vi.mock("../../../src/features/installations/components/ModalEdit", () => ({ default: () => null }))
vi.mock("../../../src/features/installations/components/ModalSuccess", () => ({ default: () => null }))
vi.mock("../../../src/features/forms/components/ModalError", () => ({ default: () => null }))
vi.mock("../../../src/features/installations/components/ModalConfirmDelete", () => ({ default: () => null }))
vi.mock("../../../src/features/installations/components/ModalAddDevice", () => ({ default: () => null }))
vi.mock("../../../src/features/installations/components/ModalCreateCategory", () => ({ default: () => null }))
vi.mock("../../../src/features/installations/components/ModalCreateInstallationType", () => ({ default: () => null }))
vi.mock("../../../src/features/installations/components/ModalManageInstallationTypes", () => ({ default: () => null }))
vi.mock("../../../src/features/installations/components/ModalManageCategories", () => ({ default: () => null }))
vi.mock("../../../src/features/maintenanceRequests/components/ModalRequestMaintenance", () => ({ default: () => null }))

describe("Installations export control", () => {
  let loadInstallations: ReturnType<typeof vi.fn>
  beforeEach(() => {
    vi.clearAllMocks()
    loadInstallations = vi.fn()
    csvServices.previewInstallationImport.mockResolvedValue({ token: "token", payloadHash: "hash", schemaVersion: "installations.v1", delimiter: ",", expiresAt: "2030-01-01T00:00:00.000Z", counts: { create: 1, update: 0, unchanged: 0, error: 0 }, rows: [] })
    csvServices.commitInstallationImport.mockResolvedValue({ create: 1, update: 0, unchanged: 0, error: 0 })
    ;(useInstallations as any).mockReturnValue({
      installations: [],
      pagination: { page: 1, totalPages: 1 },
      loading: false,
      assets: [],
      loadingAssets: false,
      errorLoadingAssets: null,
      loadInstallations,
      loadAssets: vi.fn(),
      addInstallation: vi.fn(),
      editInstallation: vi.fn(),
      removeInstallation: vi.fn(),
      addDeviceToInstallation: vi.fn(),
    })
    ;(useCategories as any).mockReturnValue({ categories: [], addCategory: vi.fn(), loadCategories: vi.fn() })
    ;(useInstallationTypes as any).mockReturnValue({ installationTypes: [], addInstallationType: vi.fn(), loadInstallationTypes: vi.fn() })
    ;(useMaintenanceRequests as any).mockReturnValue({ createRequest: vi.fn() })
  })

  it("uses the same secondary action row pattern as Assets", () => {
    ;(useAuthStore as any).mockImplementation((selector: any) => selector({ role: "admin", user: null, isAuthenticated: false }))

    const { container } = render(<Installations />)
    const exportButton = screen.getByRole("button", { name: "installations.exportResults" })
    const actionRow = exportButton.parentElement
    const searchRow = container.querySelector(`.${installationStyles.searchRow}`)

    expect(exportButton).toHaveClass(buttonStyles.secondaryButton)
    expect(screen.getByRole("button", { name: "installations.csv.downloadTemplate" })).toHaveClass(buttonStyles.secondaryButton)
    expect(screen.getByRole("button", { name: "installations.csv.import" })).toHaveClass(buttonStyles.secondaryButton)
    expect(actionRow).toHaveClass(installationStyles.csvActionsRow)
    expect(actionRow?.nextElementSibling).toBe(searchRow)
  })

  it("preserves the export permission gate", () => {
    ;(useAuthStore as any).mockImplementation((selector: any) => selector({ role: "cliente", user: null, isAuthenticated: false }))

    render(<Installations />)

    expect(screen.queryByRole("button", { name: "installations.exportResults" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "installations.csv.import" })).not.toBeInTheDocument()
  })

  it("keeps technician export while hiding template and import controls", () => {
    ;(useAuthStore as any).mockImplementation((selector: any) => selector({ role: "tecnico", user: null, isAuthenticated: false }))
    render(<Installations />)
    expect(screen.getByRole("button", { name: "installations.exportResults" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "installations.csv.downloadTemplate" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "installations.csv.import" })).not.toBeInTheDocument()
  })

  it("keeps export but hides tenant import and template controls from super administrators", () => {
    ;(useAuthStore as any).mockImplementation((selector: any) => selector({ role: "super_admin", user: null, isAuthenticated: false }))
    render(<Installations />)
    expect(screen.getByRole("button", { name: "installations.exportResults" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "installations.csv.downloadTemplate" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "installations.csv.import" })).not.toBeInTheDocument()
  })

  it("opens the shared import dialog and refreshes the current filtered list after commit", async () => {
    ;(useAuthStore as any).mockImplementation((selector: any) => selector({ role: "admin", user: null, isAuthenticated: false }))
    render(<Installations />)
    fireEvent.click(screen.getByText("installations.csv.import"))
    expect(document.querySelector('[role="dialog"]')).toBeInTheDocument()
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['csv'], 'installations.csv', { type: 'text/csv' })] } })
    fireEvent.click(screen.getByText("csvImport.preview"))
    await waitFor(() => expect(csvServices.previewInstallationImport).toHaveBeenCalled())
    fireEvent.click(screen.getByText("csvImport.commit"))
    await waitFor(() => expect(csvServices.commitInstallationImport).toHaveBeenCalled())
    expect(loadInstallations).toHaveBeenCalledWith({ page: 1, limit: 4, search: "", category: "" })
  })
})
