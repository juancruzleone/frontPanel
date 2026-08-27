import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useComplianceData } from '../../../../src/features/compliance/hooks/useComplianceData'
import * as services from '../../../../src/features/compliance/services/complianceServices'
import { useComplianceStore } from '../../../../src/store/complianceStore'
import type { Escaneo, Norma, Regla, ResumenCumplimiento } from '../../../../src/features/compliance/services/complianceTypes'

vi.mock('../../../../src/features/compliance/services/complianceServices', () => ({
  fetchNormas: vi.fn(),
  createNorma: vi.fn(),
  updateNorma: vi.fn(),
  deleteNorma: vi.fn(),
  fetchReglas: vi.fn(),
  createRegla: vi.fn(),
  updateRegla: vi.fn(),
  deleteRegla: vi.fn(),
  triggerEscaneo: vi.fn(),
  fetchResumen: vi.fn(),
}))

const norma: Norma = { _id: 'n1', codigo: 'IRAM 3517', familiaNorma: 'IRAM', activa: true }
const regla: Regla = {
  _id: 'r1', normaId: 'n1', nombre: 'Recarga', operador: 'exists',
  parametros: {}, objetivoTipo: 'activo', campoNombre: 'campo', habilitada: true,
}
const escaneo: Escaneo = {
  _id: 'e1', estado: 'pendiente', objetivosTotales: 0, procesados: 0, omitidos: 0,
  cumplidos: 0, incumplidos: 0, sinEvidencia: 0, errores: 0,
}
const resumen: ResumenCumplimiento = {
  escaneoId: 'e1', estado: 'completado', totalResultados: 8,
  porEstado: { cumplido: 5, incumplido: 2, sin_evidencia: 1, error: 0 },
}

describe('useComplianceData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useComplianceStore.getState().clearAll()
    useComplianceStore.setState({ ownerId: 'owner-1' })
  })

  it('loadAll carga normas, reglas y resumen al store', async () => {
    ;(services.fetchNormas as any).mockResolvedValue([norma])
    ;(services.fetchReglas as any).mockResolvedValue([regla])
    ;(services.fetchResumen as any).mockResolvedValue(resumen)

    const { result } = renderHook(() => useComplianceData())

    await act(async () => {
      await result.current.loadAll()
    })

    expect(useComplianceStore.getState().normas).toEqual([norma])
    expect(useComplianceStore.getState().reglas).toEqual([regla])
    expect(useComplianceStore.getState().resumen).toEqual(resumen)
    expect(result.current.error).toBeNull()
    expect(useComplianceStore.getState().loading).toBe(false)
  })

  it('loadAll expone el error cuando falla y deja de cargar', async () => {
    ;(services.fetchNormas as any).mockRejectedValue(new Error('Red caída'))

    const { result } = renderHook(() => useComplianceData())

    await act(async () => {
      await result.current.loadAll()
    })

    expect(result.current.error).toBe('Red caída')
    expect(useComplianceStore.getState().loading).toBe(false)
  })

  it('createNorma persiste vía API y recarga las listas', async () => {
    ;(services.createNorma as any).mockResolvedValue(norma)
    ;(services.fetchNormas as any).mockResolvedValue([norma])
    ;(services.fetchReglas as any).mockResolvedValue([])
    ;(services.fetchResumen as any).mockResolvedValue(resumen)

    const { result } = renderHook(() => useComplianceData())

    await act(async () => {
      await result.current.createNorma({ codigo: 'IRAM 3517', familiaNorma: 'IRAM', activa: true })
    })

    expect(services.createNorma).toHaveBeenCalledWith(expect.objectContaining({ codigo: 'IRAM 3517' }))
    expect(useComplianceStore.getState().normas).toEqual([norma])
  })

  it('updateRegla persiste vía API y recarga las listas', async () => {
    ;(services.updateRegla as any).mockResolvedValue({ ...regla, habilitada: false })
    ;(services.fetchNormas as any).mockResolvedValue([])
    ;(services.fetchReglas as any).mockResolvedValue([])
    ;(services.fetchResumen as any).mockResolvedValue(resumen)

    const { result } = renderHook(() => useComplianceData())

    await act(async () => {
      await result.current.updateRegla('r1', { habilitada: false })
    })

    expect(services.updateRegla).toHaveBeenCalledWith('r1', { habilitada: false })
    expect(services.fetchReglas).toHaveBeenCalled()
  })

  it('deleteNorma persiste vía API y recarga las listas', async () => {
    ;(services.deleteNorma as any).mockResolvedValue({ success: true })
    ;(services.fetchNormas as any).mockResolvedValue([])
    ;(services.fetchReglas as any).mockResolvedValue([])
    ;(services.fetchResumen as any).mockResolvedValue(resumen)

    const { result } = renderHook(() => useComplianceData())

    await act(async () => {
      await result.current.deleteNorma('n1')
    })

    expect(services.deleteNorma).toHaveBeenCalledWith('n1')
    expect(useComplianceStore.getState().normas).toEqual([])
  })

  it('runScan dispara el escaneo y registra el escaneo activo', async () => {
    ;(services.triggerEscaneo as any).mockResolvedValue(escaneo)

    const { result } = renderHook(() => useComplianceData())

    let devuelto: Escaneo | null = null
    await act(async () => {
      devuelto = await result.current.runScan()
    })

    expect(services.triggerEscaneo).toHaveBeenCalled()
    expect(devuelto).toEqual(escaneo)
    expect(useComplianceStore.getState().activeScanId).toBe('e1')
    expect(useComplianceStore.getState().lastScan).toEqual(escaneo)
  })

  it('runScan propaga el error 409 de conflicto', async () => {
    ;(services.triggerEscaneo as any).mockRejectedValue(new Error('Ya hay un escaneo en ejecución'))

    const { result } = renderHook(() => useComplianceData())

    await expect(result.current.runScan()).rejects.toThrow('Ya hay un escaneo en ejecución')
  })

  it('refreshStatuses recarga resumen y listas sin recargar la página', async () => {
    ;(services.fetchNormas as any).mockResolvedValue([norma])
    ;(services.fetchReglas as any).mockResolvedValue([regla])
    ;(services.fetchResumen as any).mockResolvedValue(resumen)

    const { result } = renderHook(() => useComplianceData())

    await act(async () => {
      await result.current.refreshStatuses()
    })

    expect(services.fetchResumen).toHaveBeenCalled()
    expect(services.fetchNormas).toHaveBeenCalled()
    expect(services.fetchReglas).toHaveBeenCalled()
    expect(useComplianceStore.getState().resumen).toEqual(resumen)
  })
})