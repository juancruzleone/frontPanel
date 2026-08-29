import { useCallback, useEffect, useRef, useState } from "react"
import { useAuthStore } from "../../../store/authStore"
import { useComplianceStore } from "../../../store/complianceStore"
import { isAdmin, isTechnician } from "../../../shared/utils/roleUtils"
import {
  fetchCatalogFindings,
  fetchCatalogRun,
  fetchCatalogRuns,
  startCatalogRun,
} from "../services/complianceServices"
import type { CatalogState, EscaneoEstado } from "../services/complianceTypes"

const isTerminal = (state: EscaneoEstado) => state === "completado" || state === "error"
const ownerKey = () => {
  const { tenantId, userId } = useAuthStore.getState()
  return tenantId && userId ? `${tenantId}:${userId}` : userId
}

export const useComplianceEvaluations = (pollInterval = 5000) => {
  const owner = useAuthStore((state) => state.tenantId && state.userId ? `${state.tenantId}:${state.userId}` : state.userId)
  const store = useComplianceStore()
  const controllers = useRef(new Set<AbortController>())
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stopPolling = useCallback(() => {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
  }, [])

  const request = useCallback(async <T>(
    work: (signal: AbortSignal) => Promise<T>,
    commit: (value: T, epoch: number) => boolean,
  ) => {
    const controller = new AbortController()
    controllers.current.add(controller)
    const epoch = useComplianceStore.getState().scopeEpoch
    const requestOwner = owner
    const current = () => useComplianceStore.getState().scopeEpoch === epoch && ownerKey() === requestOwner
    if (current()) { setLoading(true); setError(null) }
    try {
      const value = await work(controller.signal)
      if (current()) commit(value, epoch)
      return current() ? value : undefined
    } catch (reason: unknown) {
      if (current() && !(reason instanceof DOMException && reason.name === "AbortError")) {
        stopPolling()
        setError("compliance.evaluation.error")
      }
      return undefined
    } finally {
      controllers.current.delete(controller)
      if (current() && controllers.current.size === 0) setLoading(false)
    }
  }, [owner, stopPolling])

  const loadRuns = useCallback((page = 1, limit = 10) =>
    request((signal) => fetchCatalogRuns(page, limit, signal), store.setCatalogRuns), [request, store.setCatalogRuns])
  const loadRun = useCallback((id: string) =>
    request((signal) => fetchCatalogRun(id, signal), store.setCatalogRun), [request, store.setCatalogRun])
  const loadFindings = useCallback((id: string, page = 1, limit = 10, state?: CatalogState) =>
    request((signal) => fetchCatalogFindings(id, page, limit, state, undefined, signal), store.setCatalogFindings), [request, store.setCatalogFindings])

  const pollRun = useCallback(async (id: string) => {
    const result = await loadRun(id)
    if (result && isTerminal(result.estado)) stopPolling()
    return result
  }, [loadRun, stopPolling])

  const startPolling = useCallback((id: string) => {
    stopPolling()
    void pollRun(id).catch(() => undefined)
    timer.current = setInterval(() => { void pollRun(id).catch(() => undefined) }, pollInterval)
  }, [pollInterval, pollRun, stopPolling])

  const startEvaluation = useCallback(async (assignmentKey: string) => {
    const auth = useAuthStore.getState()
    const assignment = useComplianceStore.getState().assignments.find((item) => item.assignmentKey === assignmentKey)
    if (!isAdmin(auth.role) && !isTechnician(auth.role)) { setError("compliance.evaluation.forbidden"); return null }
    if (!assignment || assignment.status !== "active") { setError("compliance.evaluation.inactiveAssignment"); return null }
    const result = await request((signal) => startCatalogRun(assignment.assignmentKey, signal), () => true)
    if (result) { await loadRuns(); startPolling(result._id) }
    return result ?? null
  }, [loadRuns, request, startPolling])

  useEffect(() => () => {
    stopPolling()
    controllers.current.forEach((controller) => controller.abort())
    controllers.current.clear()
    setLoading(false)
    setError(null)
  }, [owner, stopPolling])

  return { ...store, loading, error, loadRuns, loadRun, loadFindings, startEvaluation, startPolling, stopPolling }
}
