import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import Assets from "../../../src/pages/Assets"
import useAssets from "../../../src/features/assets/hooks/useAssets"
import { useAuthStore } from "../../../src/store/authStore"

vi.mock("../../../src/features/assets/hooks/useAssets")
vi.mock("../../../src/store/authStore")
vi.mock("../../../src/features/assets/hooks/useAssetsTour", () => ({ useAssetsTour: () => ({ tourCompleted: true, startTour: vi.fn(), continueAssetsTour: vi.fn(), skipTour: vi.fn() }) }))
vi.mock("../../../src/shared/hooks/useResponsiveView", () => ({ useResponsiveView: () => ["cards", vi.fn(), false] }))
vi.mock("../../../src/shared/hooks/useTheme", () => ({ useTheme: () => ({ theme: "light" }) }))
vi.mock("react-router", () => ({ useNavigate: () => vi.fn(), useLocation: () => ({ state: null }) }))
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }) }))
vi.mock("../../../src/features/assets/components/ModalCreate", () => ({ default: () => null }))
vi.mock("../../../src/features/assets/components/ModalEdit", () => ({ default: () => null }))
vi.mock("../../../src/features/assets/components/ModalSuccess", () => ({ default: () => null }))
vi.mock("../../../src/features/forms/components/ModalError", () => ({ default: () => null }))
vi.mock("../../../src/features/assets/components/ModalConfirmDelete", () => ({ default: () => null }))
vi.mock("../../../src/features/assets/components/ModalAssignTemplate", () => ({ default: () => null }))

describe("Assets CSV controls", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useAssets as any).mockReturnValue({ assets: [], templates: [], categories: [], loading: false, pagination: { page: 1, totalPages: 1 }, addAsset: vi.fn(), editAsset: vi.fn(), removeAsset: vi.fn(), loadAssets: vi.fn(), assignTemplateToAsset: vi.fn(), getTemplateById: vi.fn() })
  })

  it("shows admin import and export", () => {
    ;(useAuthStore as any).mockImplementation((selector: any) => selector({ role: "admin" }))
    render(<Assets />)
    expect(screen.getByText("assets.csv.import")).toBeInTheDocument()
    expect(screen.getByText("assets.csv.downloadTemplate")).toBeInTheDocument()
    expect(screen.getByText("assets.csv.exportFiltered")).toBeInTheDocument()
  })

  it("hides CSV controls from clients because the current API reader permission excludes them", () => {
    ;(useAuthStore as any).mockImplementation((selector: any) => selector({ role: "cliente" }))
    render(<Assets />)
    expect(screen.queryByText("assets.csv.import")).not.toBeInTheDocument()
    expect(screen.queryByText("assets.csv.exportFiltered")).not.toBeInTheDocument()
  })
})
