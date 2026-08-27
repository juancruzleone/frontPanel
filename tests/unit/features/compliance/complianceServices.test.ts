import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchNormas,
  createNorma,
  updateNorma,
  deleteNorma,
  fetchReglas,
  createRegla,
  updateRegla,
  deleteRegla,
  triggerEscaneo,
  fetchEscaneo,
  fetchResumen,
  fetchObjetivo,
} from '../../../../src/features/compliance/services/complianceServices'
import type { Escaneo, Norma, Regla, ResumenCumplimiento } from '../../../../src/features/compliance/services/complianceTypes'

const ok = (body: unknown) => ({
  ok: true,
  json: () => Promise.resolve(body),
})

const notOk = (status: number, message: string) => ({
  ok: false,
  status,
  json: () => Promise.resolve({ message }),
})

describe('complianceServices', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    // @ts-expect-error - Mocking import.meta.env
    import.meta.env.VITE_API_URL = 'http://api.test/'
  })

  const norma: Norma = { _id: 'n1', codigo: 'IRAM 3517', familiaNorma: 'IRAM', descripcion: 'Recarga extintores', activa: true }
  const regla: Regla = {
    _id: 'r1', normaId: 'n1', nombre: 'Recarga cada 5 años', operador: 'fechaAntiguaMeses',
    parametros: { meses: 60 }, objetivoTipo: 'activo', campoNombre: 'fechaRecarga', etiquetaCampoSnapshot: 'Fecha de recarga', habilitada: true,
  }
  const escaneo: Escaneo = {
    _id: 'e1', estado: 'corriendo', objetivosTotales: 10, procesados: 4, omitidos: 0, cumplidos: 0, incumplidos: 0, sinEvidencia: 0, errores: 0,
  }
  const resumen: ResumenCumplimiento = {
    escaneoId: 'e1', estado: 'completado', totalResultados: 8,
    porEstado: { cumplido: 5, incumplido: 2, sin_evidencia: 1, error: 0 },
  }

  it('fetchNormas normaliza un array plano', async () => {
    ;(fetch as any).mockResolvedValue(ok([norma]))

    await expect(fetchNormas()).resolves.toEqual([norma])
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/normas-cumplimiento'), expect.any(Object))
  })

  it('fetchNormas normaliza una respuesta con clave normas', async () => {
    ;(fetch as any).mockResolvedValue(ok({ normas: [norma], total: 1 }))

    await expect(fetchNormas()).resolves.toEqual([norma])
  })

  it('fetchNormas lanza error con el mensaje del servidor', async () => {
    ;(fetch as any).mockResolvedValue(notOk(500, 'Error interno'))

    await expect(fetchNormas()).rejects.toThrow('Error interno')
  })

  it('createNorma hace POST con body JSON y devuelve la norma creada', async () => {
    ;(fetch as any).mockResolvedValue(ok(norma))
    const payload = { codigo: 'AEA 90364', familiaNorma: 'AEA', activa: true }

    await expect(createNorma(payload)).resolves.toEqual(norma)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/normas-cumplimiento'),
      expect.objectContaining({ method: 'POST', body: JSON.stringify(payload) }),
    )
  })

  it('updateNorma hace PUT a /normas-cumplimiento/:id', async () => {
    ;(fetch as any).mockResolvedValue(ok({ ...norma, activa: false }))

    await updateNorma('n1', { activa: false })

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/normas-cumplimiento/n1'),
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ activa: false }) }),
    )
  })

  it('deleteNorma hace DELETE a /normas-cumplimiento/:id', async () => {
    ;(fetch as any).mockResolvedValue(ok({ success: true }))

    await deleteNorma('n1')

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/normas-cumplimiento/n1'),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('fetchReglas normaliza un array plano', async () => {
    ;(fetch as any).mockResolvedValue(ok([regla]))

    await expect(fetchReglas()).resolves.toEqual([regla])
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/reglas-cumplimiento'), expect.any(Object))
  })

  it('createRegla hace POST con body JSON y devuelve la regla creada', async () => {
    ;(fetch as any).mockResolvedValue(ok(regla))
    const payload = { normaId: 'n1', nombre: 'Nueva regla', operador: 'exists', parametros: {}, objetivoTipo: 'activo' as const, habilitada: true }

    await expect(createRegla(payload)).resolves.toEqual(regla)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/reglas-cumplimiento'),
      expect.objectContaining({ method: 'POST', body: JSON.stringify(payload) }),
    )
  })

  it('updateRegla hace PUT a /reglas-cumplimiento/:id', async () => {
    ;(fetch as any).mockResolvedValue(ok({ ...regla, habilitada: false }))

    await updateRegla('r1', { habilitada: false })

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/reglas-cumplimiento/r1'),
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ habilitada: false }) }),
    )
  })

  it('deleteRegla hace DELETE a /reglas-cumplimiento/:id', async () => {
    ;(fetch as any).mockResolvedValue(ok({ success: true }))

    await deleteRegla('r1')

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/reglas-cumplimiento/r1'),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('triggerEscaneo hace POST a /escaneos-cumplimiento y devuelve el escaneo', async () => {
    ;(fetch as any).mockResolvedValue(ok(escaneo))

    await expect(triggerEscaneo()).resolves.toEqual(escaneo)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/escaneos-cumplimiento'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('triggerEscaneo propaga el error de conflicto 409 con mensaje', async () => {
    ;(fetch as any).mockResolvedValue(notOk(409, 'Ya hay un escaneo en ejecución'))

    await expect(triggerEscaneo()).rejects.toThrow('Ya hay un escaneo en ejecución')
  })

  it('fetchEscaneo obtiene /escaneos-cumplimiento/:id', async () => {
    ;(fetch as any).mockResolvedValue(ok(escaneo))

    await expect(fetchEscaneo('e1')).resolves.toEqual(escaneo)
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/escaneos-cumplimiento/e1'), expect.any(Object))
  })

  it('fetchResumen obtiene /cumplimiento/resumen', async () => {
    ;(fetch as any).mockResolvedValue(ok(resumen))

    await expect(fetchResumen()).resolves.toEqual(resumen)
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/cumplimiento/resumen'), expect.any(Object))
  })

  it('fetchObjetivo obtiene /cumplimiento/objetivos/:tipo/:id y devuelve resultados', async () => {
    const resultados = [{ _id: 'x1', escaneoId: 'e1', reglaId: 'r1', normaId: 'n1', objetivoTipo: 'activo', objetoId: 'a1', estado: 'cumplido', razon: 'ok', evaluadoEn: '2026-08-01T00:00:00Z' }]
    ;(fetch as any).mockResolvedValue(ok(resultados))

    await expect(fetchObjetivo('activo', 'a1')).resolves.toEqual(resultados)
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/cumplimiento/objetivos/activo/a1'), expect.any(Object))
  })
})