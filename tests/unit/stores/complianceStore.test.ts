import { describe, it, expect, beforeEach } from 'vitest'
import { useComplianceStore } from '../../../src/store/complianceStore'
import type { Escaneo, Norma, Regla, ResumenCumplimiento } from '../../../../src/features/compliance/services/complianceTypes'

const norma: Norma = { _id: 'n1', codigo: 'IRAM 3517', familiaNorma: 'IRAM', activa: true }
const regla: Regla = {
  _id: 'r1', normaId: 'n1', nombre: 'Recarga cada 5 años', operador: 'fechaAntiguaMeses',
  parametros: { meses: 60 }, objetivoTipo: 'activo', campoNombre: 'fechaRecarga', habilitada: true,
}
const escaneo: Escaneo = {
  _id: 'e1', estado: 'corriendo', objetivosTotales: 10, procesados: 4, omitidos: 0,
  cumplidos: 0, incumplidos: 0, sinEvidencia: 0, errores: 0,
}
const resumen: ResumenCumplimiento = {
  escaneoId: 'e1', estado: 'completado', totalResultados: 8,
  porEstado: { cumplido: 5, incumplido: 2, sin_evidencia: 1, error: 0 },
}

describe('complianceStore', () => {
  beforeEach(() => {
    useComplianceStore.getState().clearAll()
    useComplianceStore.setState({ ownerId: null })
  })

  it('setNormas guarda normas y actualiza lastUpdated', () => {
    const before = useComplianceStore.getState().lastUpdated
    useComplianceStore.getState().setNormas([norma])

    const state = useComplianceStore.getState()
    expect(state.normas).toEqual([norma])
    expect(state.lastUpdated).not.toBeNull()
    expect(state.lastUpdated).not.toBe(before)
  })

  it('setReglas guarda reglas', () => {
    useComplianceStore.getState().setReglas([regla])
    expect(useComplianceStore.getState().reglas).toEqual([regla])
  })

  it('setResumen guarda el resumen', () => {
    useComplianceStore.getState().setResumen(resumen)
    expect(useComplianceStore.getState().resumen).toEqual(resumen)
  })

  it('setLastScan guarda el último escaneo', () => {
    useComplianceStore.getState().setLastScan(escaneo)
    expect(useComplianceStore.getState().lastScan).toEqual(escaneo)
  })

  it('setActiveScanId guarda el id del escaneo activo', () => {
    useComplianceStore.getState().setActiveScanId('e1')
    expect(useComplianceStore.getState().activeScanId).toBe('e1')
  })

  it('setOwnerId con otro owner limpia los datos previos', () => {
    useComplianceStore.getState().setNormas([norma])
    useComplianceStore.getState().setReglas([regla])
    useComplianceStore.getState().setOwnerId('otro-tenant')

    const state = useComplianceStore.getState()
    expect(state.ownerId).toBe('otro-tenant')
    expect(state.normas).toEqual([])
    expect(state.reglas).toEqual([])
    expect(state.resumen).toBeNull()
    expect(state.lastScan).toBeNull()
    expect(state.activeScanId).toBeNull()
  })

  it('setOwnerId con el mismo owner no limpia datos', () => {
    useComplianceStore.getState().setOwnerId('owner-1')
    useComplianceStore.getState().setNormas([norma])
    useComplianceStore.getState().setOwnerId('owner-1')

    expect(useComplianceStore.getState().normas).toEqual([norma])
  })

  it('clearAll restablece el estado completo', () => {
    useComplianceStore.getState().setNormas([norma])
    useComplianceStore.getState().setReglas([regla])
    useComplianceStore.getState().setResumen(resumen)
    useComplianceStore.getState().setLastScan(escaneo)
    useComplianceStore.getState().setActiveScanId('e1')

    useComplianceStore.getState().clearAll()

    const state = useComplianceStore.getState()
    expect(state.normas).toEqual([])
    expect(state.reglas).toEqual([])
    expect(state.resumen).toBeNull()
    expect(state.lastScan).toBeNull()
    expect(state.activeScanId).toBeNull()
    expect(state.loading).toBe(false)
    expect(state.ownerId).toBeNull()
  })
})