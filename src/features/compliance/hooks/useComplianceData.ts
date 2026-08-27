import { useCallback, useState } from "react"
import { useComplianceStore } from "../../../store/complianceStore"
import {
  createNorma as apiCreateNorma,
  updateNorma as apiUpdateNorma,
  deleteNorma as apiDeleteNorma,
  fetchNormas,
  createRegla as apiCreateRegla,
  updateRegla as apiUpdateRegla,
  deleteRegla as apiDeleteRegla,
  fetchReglas,
  fetchResumen,
  triggerEscaneo,
} from "../services/complianceServices"
import type {
  Escaneo,
  NormaPayload,
  ReglaPayload,
} from "../services/complianceTypes"

/**
 * Hook de datos del dominio compliance: carga las listas y el resumen al store
 * y expone las operaciones CRUD + disparo de escaneo, refrescando los estados
 * tras cada mutación (sin recarga de página).
 */
export const useComplianceData = () => {
  const {
    normas,
    reglas,
    resumen,
    loading,
    setNormas,
    setReglas,
    setResumen,
    setLoading,
    setLastScan,
    setActiveScanId,
  } = useComplianceStore()
  const [error, setError] = useState<string | null>(null)

  const refreshStatuses = useCallback(async () => {
    const [normasResultado, reglasResultado, resumenResultado] = await Promise.all([
      fetchNormas(),
      fetchReglas(),
      fetchResumen(),
    ])
    setNormas(normasResultado)
    setReglas(reglasResultado)
    setResumen(resumenResultado)
  }, [setNormas, setReglas, setResumen])

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await refreshStatuses()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al cargar compliance")
    } finally {
      setLoading(false)
    }
  }, [refreshStatuses, setLoading])

  const createNorma = useCallback(
    async (norma: NormaPayload) => {
      const creada = await apiCreateNorma(norma)
      await refreshStatuses()
      return creada
    },
    [refreshStatuses],
  )

  const updateNorma = useCallback(
    async (id: string, data: Partial<NormaPayload>) => {
      const actualizada = await apiUpdateNorma(id, data)
      await refreshStatuses()
      return actualizada
    },
    [refreshStatuses],
  )

  const deleteNorma = useCallback(
    async (id: string) => {
      const resultado = await apiDeleteNorma(id)
      await refreshStatuses()
      return resultado
    },
    [refreshStatuses],
  )

  const createRegla = useCallback(
    async (regla: ReglaPayload) => {
      const creada = await apiCreateRegla(regla)
      await refreshStatuses()
      return creada
    },
    [refreshStatuses],
  )

  const updateRegla = useCallback(
    async (id: string, data: Partial<ReglaPayload>) => {
      const actualizada = await apiUpdateRegla(id, data)
      await refreshStatuses()
      return actualizada
    },
    [refreshStatuses],
  )

  const deleteRegla = useCallback(
    async (id: string) => {
      const resultado = await apiDeleteRegla(id)
      await refreshStatuses()
      return resultado
    },
    [refreshStatuses],
  )

  const runScan = useCallback(async (): Promise<Escaneo> => {
    const escaneo = await triggerEscaneo()
    setLastScan(escaneo)
    setActiveScanId(escaneo._id)
    return escaneo
  }, [setLastScan, setActiveScanId])

  return {
    normas,
    reglas,
    resumen,
    loading,
    error,
    loadAll,
    refreshStatuses,
    createNorma,
    updateNorma,
    deleteNorma,
    createRegla,
    updateRegla,
    deleteRegla,
    runScan,
  }
}