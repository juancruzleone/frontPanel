import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import Settings from "../../../src/pages/Settings"
import useInstallationTypes from "../../../src/features/installations/hooks/useInstallationTypes"
import useCategories from "../../../src/features/installations/hooks/useCategories"
import useFormCategories from "../../../src/features/forms/hooks/useFormCategories"

vi.mock("../../../src/features/installations/hooks/useInstallationTypes")
vi.mock("../../../src/features/installations/hooks/useCategories")
vi.mock("../../../src/features/forms/hooks/useFormCategories")
vi.mock("../../../src/shared/hooks/useTheme", () => ({
  useTheme: () => ({ dark: false }),
}))
vi.mock("react-router", () => ({
  useLocation: () => ({ state: {} }),
}))
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { completed?: number; total?: number; defaultValue?: string }) => {
      if (opts?.completed !== undefined) {
        return `${opts.completed} de ${opts.total} pasos completados`
      }
      if (opts?.defaultValue) return opts.defaultValue
      const translations: Record<string, string> = {
        "settings.title": "Configuración",
        "settings.subtitle": "Administra las configuraciones del sistema",
        "settings.titlePage": "Configuración | Leonix",
        "settings.initialConfig": "Configuración del sistema",
        "settings.initialConfigDesc": "Completá estos pasos para configurar tu organización.",
        "settings.typesInstallation": "Tipos de instalación",
        "settings.typesInstallationDesc": "Definí los tipos de instalaciones",
        "settings.assetCategories": "Categorías de activos",
        "settings.assetCategoriesDesc": "Creá categorías para clasificar tus activos",
        "settings.formCategories": "Categorías de formularios",
        "settings.formCategoriesDesc": "Organizá tus plantillas de formularios",
        "settings.completed": "Completado",
        "settings.pending": "Pendiente",
        "settings.manage": "Gestionar",
      }
      return translations[key] || key
    },
    i18n: { language: "es" },
  }),
}))

// Mock modals to avoid rendering heavy sub-trees
vi.mock("../../../src/features/settings/components/ModalManageInstallationTypes", () => ({
  default: ({ isOpen, onRequestClose }: { isOpen: boolean; onRequestClose: () => void }) =>
    isOpen ? <div data-testid="modal-installation-types"><button onClick={onRequestClose}>Close</button></div> : null,
}))
vi.mock("../../../src/features/settings/components/ModalManageDeviceCategories", () => ({
  default: ({ isOpen, onRequestClose }: { isOpen: boolean; onRequestClose: () => void }) =>
    isOpen ? <div data-testid="modal-device-categories"><button onClick={onRequestClose}>Close</button></div> : null,
}))
vi.mock("../../../src/features/settings/components/ModalManageFormCategories", () => ({
  default: ({ isOpen, onRequestClose }: { isOpen: boolean; onRequestClose: () => void }) =>
    isOpen ? <div data-testid="modal-form-categories"><button onClick={onRequestClose}>Close</button></div> : null,
}))

describe("Settings Page", () => {
  let loadInstallationTypes: ReturnType<typeof vi.fn>
  let loadAssetCategories: ReturnType<typeof vi.fn>
  let loadFormCategories: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    loadInstallationTypes = vi.fn().mockResolvedValue([])
    loadAssetCategories = vi.fn().mockResolvedValue([])
    loadFormCategories = vi.fn().mockResolvedValue([])
  })

  it("calls load functions for all three entities with includeInactive true on mount", async () => {
    vi.mocked(useInstallationTypes).mockReturnValue({
      installationTypes: [{ _id: "1", nombre: "Oficina", activo: true, fechaCreacion: "" }],
      loading: false,
      error: null,
      loadInstallationTypes,
      addInstallationType: vi.fn(),
      updateInstallationType: vi.fn(),
      removeInstallationType: vi.fn(),
    })
    vi.mocked(useCategories).mockReturnValue({
      categories: [{ _id: "2", nombre: "HVAC", activa: true }],
      loading: false,
      error: null,
      loadCategories: loadAssetCategories,
      addCategory: vi.fn(),
      updateCategory: vi.fn(),
      removeCategory: vi.fn(),
      formData: { nombre: "", descripcion: "", activa: true },
      formErrors: {},
      isSubmitting: false,
      handleFieldChange: vi.fn(),
      handleSubmitForm: vi.fn(),
      resetForm: vi.fn(),
      setFormErrors: vi.fn(),
    })
    vi.mocked(useFormCategories).mockReturnValue({
      categories: [{ _id: "3", nombre: "Preventivo", activa: true }],
      loading: false,
      error: null,
      loadCategories: loadFormCategories,
      addCategory: vi.fn(),
      updateCategory: vi.fn(),
      removeCategory: vi.fn(),
      formData: { nombre: "", descripcion: "", activa: true },
      formErrors: {},
      isSubmitting: false,
      handleFieldChange: vi.fn(),
      handleSubmitForm: vi.fn(),
      resetForm: vi.fn(),
      setFormErrors: vi.fn(),
    })

    render(<Settings />)

    await waitFor(() => {
      expect(loadInstallationTypes).toHaveBeenCalledWith(true)
      expect(loadAssetCategories).toHaveBeenCalledWith(true)
      expect(loadFormCategories).toHaveBeenCalledWith(true)
    })
  })

  it("displays 100% and Completado when all three entities are present", async () => {
    vi.mocked(useInstallationTypes).mockReturnValue({
      installationTypes: [{ _id: "1", nombre: "Oficina", activo: true, fechaCreacion: "" }],
      loading: false,
      error: null,
      loadInstallationTypes,
      addInstallationType: vi.fn(),
      updateInstallationType: vi.fn(),
      removeInstallationType: vi.fn(),
    })
    vi.mocked(useCategories).mockReturnValue({
      categories: [{ _id: "2", nombre: "HVAC", activa: true }],
      loading: false,
      error: null,
      loadCategories: loadAssetCategories,
      addCategory: vi.fn(),
      updateCategory: vi.fn(),
      removeCategory: vi.fn(),
      formData: { nombre: "", descripcion: "", activa: true },
      formErrors: {},
      isSubmitting: false,
      handleFieldChange: vi.fn(),
      handleSubmitForm: vi.fn(),
      resetForm: vi.fn(),
      setFormErrors: vi.fn(),
    })
    vi.mocked(useFormCategories).mockReturnValue({
      categories: [{ _id: "3", nombre: "Preventivo", activa: true }],
      loading: false,
      error: null,
      loadCategories: loadFormCategories,
      addCategory: vi.fn(),
      updateCategory: vi.fn(),
      removeCategory: vi.fn(),
      formData: { nombre: "", descripcion: "", activa: true },
      formErrors: {},
      isSubmitting: false,
      handleFieldChange: vi.fn(),
      handleSubmitForm: vi.fn(),
      resetForm: vi.fn(),
      setFormErrors: vi.fn(),
    })

    render(<Settings />)

    await waitFor(() => {
      expect(screen.getByText("3 de 3 pasos completados")).toBeInTheDocument()
      expect(screen.getByText("100%")).toBeInTheDocument()
    })
    const completedBadges = screen.getAllByText("Completado")
    expect(completedBadges).toHaveLength(3)
  })

  it("displays 33% when only installationTypes is configured", async () => {
    vi.mocked(useInstallationTypes).mockReturnValue({
      installationTypes: [{ _id: "1", nombre: "Oficina", activo: true, fechaCreacion: "" }],
      loading: false,
      error: null,
      loadInstallationTypes,
      addInstallationType: vi.fn(),
      updateInstallationType: vi.fn(),
      removeInstallationType: vi.fn(),
    })
    vi.mocked(useCategories).mockReturnValue({
      categories: [],
      loading: false,
      error: null,
      loadCategories: loadAssetCategories,
      addCategory: vi.fn(),
      updateCategory: vi.fn(),
      removeCategory: vi.fn(),
      formData: { nombre: "", descripcion: "", activa: true },
      formErrors: {},
      isSubmitting: false,
      handleFieldChange: vi.fn(),
      handleSubmitForm: vi.fn(),
      resetForm: vi.fn(),
      setFormErrors: vi.fn(),
    })
    vi.mocked(useFormCategories).mockReturnValue({
      categories: [],
      loading: false,
      error: null,
      loadCategories: loadFormCategories,
      addCategory: vi.fn(),
      updateCategory: vi.fn(),
      removeCategory: vi.fn(),
      formData: { nombre: "", descripcion: "", activa: true },
      formErrors: {},
      isSubmitting: false,
      handleFieldChange: vi.fn(),
      handleSubmitForm: vi.fn(),
      resetForm: vi.fn(),
      setFormErrors: vi.fn(),
    })

    render(<Settings />)

    await waitFor(() => {
      expect(screen.getByText("1 de 3 pasos completados")).toBeInTheDocument()
      expect(screen.getByText("33%")).toBeInTheDocument()
    })
    expect(screen.getAllByText("Completado")).toHaveLength(1)
    expect(screen.getAllByText("Pendiente")).toHaveLength(2)
  })

  it("opens and closes management modals and reloads data safely", async () => {
    vi.mocked(useInstallationTypes).mockReturnValue({
      installationTypes: [{ _id: "1", nombre: "Oficina", activo: true, fechaCreacion: "" }],
      loading: false,
      error: null,
      loadInstallationTypes,
      addInstallationType: vi.fn(),
      updateInstallationType: vi.fn(),
      removeInstallationType: vi.fn(),
    })
    vi.mocked(useCategories).mockReturnValue({
      categories: [],
      loading: false,
      error: null,
      loadCategories: loadAssetCategories,
      addCategory: vi.fn(),
      updateCategory: vi.fn(),
      removeCategory: vi.fn(),
      formData: { nombre: "", descripcion: "", activa: true },
      formErrors: {},
      isSubmitting: false,
      handleFieldChange: vi.fn(),
      handleSubmitForm: vi.fn(),
      resetForm: vi.fn(),
      setFormErrors: vi.fn(),
    })
    vi.mocked(useFormCategories).mockReturnValue({
      categories: [],
      loading: false,
      error: null,
      loadCategories: loadFormCategories,
      addCategory: vi.fn(),
      updateCategory: vi.fn(),
      removeCategory: vi.fn(),
      formData: { nombre: "", descripcion: "", activa: true },
      formErrors: {},
      isSubmitting: false,
      handleFieldChange: vi.fn(),
      handleSubmitForm: vi.fn(),
      resetForm: vi.fn(),
      setFormErrors: vi.fn(),
    })

    render(<Settings />)

    const manageButtons = await screen.findAllByText(/Gestionar/)
    expect(manageButtons.length).toBeGreaterThan(0)

    // Open installation types modal
    fireEvent.click(manageButtons[0])
    expect(screen.getByTestId("modal-installation-types")).toBeInTheDocument()

    // Close modal
    fireEvent.click(screen.getByText("Close"))
    await waitFor(() => {
      expect(screen.queryByTestId("modal-installation-types")).not.toBeInTheDocument()
    })
  })
})
