import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useComplianceCatalog } from "../../../../src/features/compliance/hooks/useComplianceCatalog"
import { useAuthStore } from "../../../../src/store/authStore"
import { useComplianceStore } from "../../../../src/store/complianceStore"

describe("useComplianceCatalog lifecycle", () => {
  beforeEach(() => {
    useComplianceStore.getState().clearAll()
    useAuthStore.setState({ tenantId: "t1", userId: "u1" })
    vi.stubGlobal("fetch", vi.fn())
  })

  it("aborts an in-flight request when the tenant changes", async () => {
    let signal: AbortSignal | undefined
    ;(fetch as any).mockImplementation((_url: string, options: RequestInit) => {
      signal = options.signal
      return new Promise(() => {})
    })
    const { result, rerender, unmount } = renderHook(() => useComplianceCatalog())

    void result.current.loadPacks()
    await Promise.resolve()
    useAuthStore.setState({ tenantId: "t2", userId: "u2" })
    rerender()

    expect(signal?.aborted).toBe(true)
    unmount()
  })

  it("rejects stale responses using the store scope epoch", () => {
    const oldEpoch = useComplianceStore.getState().scopeEpoch
    useComplianceStore.getState().setOwnerId("t2:u2")

    expect(useComplianceStore.getState().setCatalogPacks({
      items: [], page: 1, limit: 10, total: 0, totalPages: 0,
    }, oldEpoch)).toBe(false)
  })
})
