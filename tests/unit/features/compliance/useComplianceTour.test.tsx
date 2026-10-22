import type { ReactNode } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { I18nextProvider } from "react-i18next"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Config, Driver } from "driver.js"
import i18n from "../../../../src/i18n"
import { useComplianceTour } from "../../../../src/features/compliance/hooks/useComplianceTour"

const driverMocks = vi.hoisted(() => ({
  config: undefined as Config | undefined,
  drive: vi.fn(),
  destroy: vi.fn(),
  isActive: vi.fn(() => true),
}))

vi.mock("driver.js", () => ({
  driver: vi.fn((config: Config) => {
    driverMocks.config = config
    return {
      drive: driverMocks.drive,
      destroy: driverMocks.destroy,
      isActive: driverMocks.isActive,
    } as Driver
  }),
}))

vi.mock("../../../../src/shared/hooks/useTheme", () => ({
  useTheme: () => ({ dark: false, toggleTheme: vi.fn() }),
}))

const wrapper = ({ children }: { children: ReactNode }) => (
  <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
)

const hookOptions = { isAdmin: true }

const hookContext = (driver: Driver) => ({
  config: driverMocks.config as Config,
  state: {},
  driver,
  index: 0,
})

describe("useComplianceTour", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    driverMocks.config = undefined
    driverMocks.isActive.mockReturnValue(true)
    localStorage.clear()
    await i18n.changeLanguage("es")
  })

  it("starts one localized admin tour and ignores duplicate starts while active", () => {
    const { result } = renderHook(() => useComplianceTour(hookOptions), { wrapper })

    act(() => {
      result.current.startTour()
      result.current.startTour()
    })

    expect(driverMocks.drive).toHaveBeenCalledTimes(1)
    expect(driverMocks.config?.steps).toHaveLength(8)
    expect(driverMocks.config?.nextBtnText).toBe("Siguiente")
    expect(driverMocks.config?.skipMissingElement).toBe(true)
  })

  it("marks the tour complete only when the user finishes it", async () => {
    const { result } = renderHook(() => useComplianceTour(hookOptions), { wrapper })

    act(() => result.current.startTour())
    const driver = hookContext({ destroy: driverMocks.destroy } as Driver)

    act(() => {
      driverMocks.config?.onDoneClick?.(undefined, {}, driver)
    })

    await waitFor(() => expect(result.current.tourCompleted).toBe(true))
    expect(localStorage.getItem("complianceTourCompleted")).toBe("true")
    expect(driverMocks.destroy).toHaveBeenCalledTimes(1)
  })

  it("destroys an active tour on unmount without marking it complete", () => {
    const { result, unmount } = renderHook(() => useComplianceTour(hookOptions), { wrapper })

    act(() => result.current.startTour())
    unmount()

    expect(driverMocks.destroy).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem("complianceTourCompleted")).toBeNull()
  })
})
