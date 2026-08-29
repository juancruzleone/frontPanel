import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  fetchCatalogFindings,
  fetchCatalogRun,
  fetchCatalogRuns,
  startCatalogRun,
} from "../../../../src/features/compliance/services/complianceServices"
import { useComplianceEvaluations } from "../../../../src/features/compliance/hooks/useComplianceEvaluations"
import { useAuthStore } from "../../../../src/store/authStore"
import { useComplianceStore } from "../../../../src/store/complianceStore"

vi.mock("../../../../src/features/compliance/services/complianceServices", () => ({
  fetchCatalogFindings: vi.fn(), fetchCatalogRun: vi.fn(), fetchCatalogRuns: vi.fn(), startCatalogRun: vi.fn(),
}))

const page = { items: [], page: 1, limit: 10, total: 0, totalPages: 0 }
const run = { _id: "run-1", source: "catalog", estado: "pendiente", progress: { total: 1, processed: 0, skipped: 0 }, counts: { PASS: 0, WARN: 0, FAIL: 0, NOT_APPLICABLE: 0, INSUFFICIENT_EVIDENCE: 0, ERROR: 0 }, score: null }
const assignment = { assignmentKey: "pack:1", packKey: "pack", version: 1, status: "active", scope: "tenant", parameters: {}, controlScopes: [] }

describe("useComplianceEvaluations", () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    useComplianceStore.getState().clearAll()
    useComplianceStore.getState().setAssignments([assignment])
    useAuthStore.setState({ tenantId: "tenant-1", userId: "user-1", role: "admin" })
    vi.mocked(fetchCatalogRuns).mockResolvedValue(page)
    vi.mocked(fetchCatalogFindings).mockResolvedValue(page)
    vi.mocked(fetchCatalogRun).mockResolvedValue({ ...run, estado: "completado" } as never)
    vi.mocked(startCatalogRun).mockResolvedValue({ _id: "run-1", estado: "pendiente" } as never)
  })

  it("loads typed run resources and starts only the active assignment", async () => {
    const { result } = renderHook(() => useComplianceEvaluations())
    await act(async () => {
      await result.current.loadRuns()
      await result.current.loadRun("run-1")
      await result.current.loadFindings("run-1", 1, 20, "WARN")
      await result.current.startEvaluation("pack:1")
    })
    expect(fetchCatalogRuns).toHaveBeenCalledWith(1, 10, expect.any(AbortSignal))
    expect(fetchCatalogFindings).toHaveBeenCalledWith("run-1", 1, 20, "WARN", undefined, expect.any(AbortSignal))
    expect(startCatalogRun).toHaveBeenCalledWith("pack:1", expect.any(AbortSignal))
  })

  it("stops polling on a terminal run and cleans the timer on unmount", async () => {
    vi.useFakeTimers()
    vi.mocked(fetchCatalogRun)
      .mockResolvedValueOnce({ ...run, estado: "corriendo" } as never)
      .mockResolvedValueOnce({ ...run, estado: "completado" } as never)
    const { result, unmount } = renderHook(() => useComplianceEvaluations(100))
    act(() => result.current.startPolling("run-1"))
    await act(async () => { await Promise.resolve() })
    await act(async () => { vi.advanceTimersByTime(100); await Promise.resolve() })
    expect(fetchCatalogRun).toHaveBeenCalledTimes(2)
    act(() => vi.advanceTimersByTime(300))
    expect(fetchCatalogRun).toHaveBeenCalledTimes(2)
    unmount()
  })

  it("aborts stale tenant requests and suppresses rejected polling errors", async () => {
    let signal: AbortSignal | undefined
    vi.mocked(fetchCatalogRuns).mockImplementation((_page, _limit, requestSignal) => {
      signal = requestSignal
      return new Promise(() => {})
    })
    const { result, rerender } = renderHook(() => useComplianceEvaluations(100))
    void result.current.loadRuns()
    await Promise.resolve()
    useAuthStore.setState({ tenantId: "tenant-2", userId: "user-2" })
    rerender()
    expect(signal?.aborted).toBe(true)

    vi.useFakeTimers()
    vi.mocked(fetchCatalogRun).mockRejectedValue(new Error("network"))
    const polling = renderHook(() => useComplianceEvaluations(100))
    act(() => polling.result.current.startPolling("run-1"))
    await act(async () => { await Promise.resolve() })
    expect(polling.result.current.error).toBe("compliance.evaluation.error")
    act(() => vi.advanceTimersByTime(300))
    expect(fetchCatalogRun).toHaveBeenCalledTimes(1)
    polling.unmount()
  })

  it("allows admins and normalized technicians, but rejects clients and inactive assignments", async () => {
    const { result, unmount } = renderHook(() => useComplianceEvaluations())
    useComplianceStore.getState().setAssignments([{ ...assignment, status: "inactive" }])
    await act(async () => { expect(await result.current.startEvaluation("pack:1")).toBeNull() })
    useComplianceStore.getState().setAssignments([assignment])
    for (const role of ["admin", "tecnico", "técnico"]) {
      useAuthStore.setState({ role })
      await act(async () => { expect(await result.current.startEvaluation("pack:1")).not.toBeNull() })
    }
    expect(startCatalogRun).toHaveBeenCalledTimes(3)
    for (const role of ["cliente", "viewer"]) {
      useAuthStore.setState({ role })
      await act(async () => { expect(await result.current.startEvaluation("pack:1")).toBeNull() })
    }
    unmount()
  })

  it("rejects older same-owner detail and findings responses", async () => {
    let resolveDetailA: ((value: never) => void) | undefined
    let resolveFindingsA: ((value: never) => void) | undefined
    const detailA = new Promise<never>((resolve) => { resolveDetailA = resolve })
    const findingsA = new Promise<never>((resolve) => { resolveFindingsA = resolve })
    vi.mocked(fetchCatalogRun).mockImplementation((id) => id === "A" ? detailA : Promise.resolve({ ...run, _id: "B" } as never))
    vi.mocked(fetchCatalogFindings).mockImplementation((id) => id === "A" ? findingsA : Promise.resolve({ ...page, items: [{ id: "B" }] } as never))
    const { result } = renderHook(() => useComplianceEvaluations())
    const oldDetail = result.current.loadRun("A")
    await act(async () => { await result.current.loadRun("B") })
    resolveDetailA?.({ ...run, _id: "A" } as never)
    await act(async () => { await oldDetail })
    expect(useComplianceStore.getState().catalogRun?._id).toBe("B")
    const oldFindings = result.current.loadFindings("A")
    await act(async () => { await result.current.loadFindings("B") })
    resolveFindingsA?.({ ...page, items: [{ id: "A" }] } as never)
    await act(async () => { await oldFindings })
    expect(useComplianceStore.getState().catalogFindings?.items[0]).toEqual({ id: "B" })
  })
})
