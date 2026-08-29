import { useCallback, useEffect, useRef, useState } from "react"
import { useAuthStore } from "../../../store/authStore"
import { useComplianceStore } from "../../../store/complianceStore"
import { createAssignment, fetchAssignments, fetchCatalogPack, fetchCatalogPacks } from "../services/complianceServices"
const getOwnerKey = () => {
  const { tenantId, userId } = useAuthStore.getState()
  return tenantId && userId ? `${tenantId}:${userId}` : userId
}

export const useComplianceCatalog = () => {
  const owner = useAuthStore((state) => state.tenantId && state.userId ? `${state.tenantId}:${state.userId}` : state.userId)
  const store = useComplianceStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const controllers = useRef(new Set<AbortController>())
  const run = useCallback(async <T>(work: (signal: AbortSignal) => Promise<T>, commit: (value: T, epoch: number) => boolean) => {
    const controller = new AbortController()
    controllers.current.add(controller)
    const epoch = useComplianceStore.getState().scopeEpoch
    const requestOwner = owner
    const current = () => useComplianceStore.getState().scopeEpoch === epoch && getOwnerKey() === requestOwner
    if (current()) {
      setLoading(true)
      setError(null)
    }
    try {
      const value = await work(controller.signal)
      if (current()) commit(value, epoch)
      return value
    } catch (reason: unknown) {
      if (current() && !(reason instanceof DOMException && reason.name === "AbortError")) {
        setError("catalog.error")
      }
      return undefined
    } finally {
      controllers.current.delete(controller)
      if (current() && !controllers.current.size) setLoading(false)
    }
  }, [owner])
  const loadPacks = useCallback((page = 1, limit = 10) => run((signal) => fetchCatalogPacks(page, limit, signal), store.setCatalogPacks), [run, store.setCatalogPacks])
  const loadPack = useCallback((packKey: string, version: number) => run((signal) => fetchCatalogPack(packKey, version, signal), store.setCatalogPack), [run, store.setCatalogPack])
  const loadAssignments = useCallback(() => run(fetchAssignments, store.setAssignments), [run, store.setAssignments])
  const saveAssignment = useCallback(async (payload: { assignmentKey: string; packKey: string; version: number; parameters: Record<string, unknown> }) => {
    if (useAuthStore.getState().role !== "admin") {
      setError("catalog.forbidden")
      return null
    }
    const epoch = useComplianceStore.getState().scopeEpoch
    const ownerAtStart = owner
    const controller = new AbortController()
    controllers.current.add(controller)
    try {
      const value = await createAssignment(payload, controller.signal)
      const current = useComplianceStore.getState().scopeEpoch === epoch && getOwnerKey() === ownerAtStart
      if (current) await loadAssignments()
      return current ? value : null
    } catch (reason: unknown) {
      if (useComplianceStore.getState().scopeEpoch === epoch && getOwnerKey() === ownerAtStart && !(reason instanceof DOMException && reason.name === "AbortError")) setError("catalog.error")
      return null
    } finally {
      controllers.current.delete(controller)
    }
  }, [loadAssignments, owner])
  useEffect(() => () => { controllers.current.forEach((controller) => controller.abort()); controllers.current.clear(); setLoading(false); setError(null) }, [owner])
  return { ...store, loading, error, loadPacks, loadPack, loadAssignments, saveAssignment }
}
