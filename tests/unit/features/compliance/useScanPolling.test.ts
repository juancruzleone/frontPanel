import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { useScanPolling } from '../../../../src/features/compliance/hooks/useScanPolling'
import type { Escaneo } from '../../../../src/features/compliance/services/complianceTypes'

const makeEscaneo = (overrides: Partial<Escaneo>): Escaneo => ({
  _id: 'e1', estado: 'corriendo', objetivosTotales: 10, procesados: 0,
  omitidos: 0, cumplidos: 0, incumplidos: 0, sinEvidencia: 0, errores: 0,
  ...overrides,
})

describe('useScanPolling', () => {
  let progreso: number
  let falla: boolean

  const server = setupServer(
    http.get('/api/escaneos-cumplimiento/e1', () => {
      if (falla) {
        return HttpResponse.json({ message: 'Error de servidor' }, { status: 500 })
      }
      if (progreso >= 10) {
        return HttpResponse.json(makeEscaneo({ estado: 'completado', procesados: 10, cumplidos: 6, incumplidos: 4 }))
      }
      const escaneo = makeEscaneo({ estado: 'corriendo', procesados: progreso })
      progreso += 4
      return HttpResponse.json(escaneo)
    }),
  )

  beforeAll(() => server.listen())
  afterEach(() => {
    server.resetHandlers()
    vi.useRealTimers()
  })
  afterAll(() => server.close())

  beforeEach(() => {
    progreso = 0
    falla = false
    vi.useFakeTimers()
  })

  it('avanza el progreso con cada tick hasta el estado terminal', async () => {
    const { result } = renderHook(() => useScanPolling('e1', { intervalMs: 3000 }))

    // tick inicial: corriendo 0/10
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(result.current.escaneo?.estado).toBe('corriendo')
    expect(result.current.isPolling).toBe(true)

    // tick 2: corriendo 4/10
    await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
    expect(result.current.escaneo?.procesados).toBe(4)

    // tick 3: corriendo 8/10
    await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
    expect(result.current.escaneo?.procesados).toBe(8)

    // tick 4: completado 10/10 → terminal
    await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
    expect(result.current.escaneo?.estado).toBe('completado')
    expect(result.current.escaneo?.procesados).toBe(10)
    expect(result.current.terminal).toBe(true)
    expect(result.current.isPolling).toBe(false)
  })

  it('deja de consultar después del estado terminal', async () => {
    const { result } = renderHook(() => useScanPolling('e1', { intervalMs: 3000 }))

    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
    await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
    await act(async () => { await vi.advanceTimersByTimeAsync(3000) })

    expect(result.current.terminal).toBe(true)

    const fetchesTrasTerminal = vi.getTimerCount()
    await act(async () => { await vi.advanceTimersByTimeAsync(9000) })
    expect(vi.getTimerCount()).toBe(fetchesTrasTerminal)
    expect(result.current.isPolling).toBe(false)
  })

  it('invoca onComplete una sola vez con el escaneo terminal', async () => {
    const onComplete = vi.fn()
    renderHook(() => useScanPolling('e1', { intervalMs: 3000, onComplete }))

    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
    await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
    await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
    await act(async () => { await vi.advanceTimersByTimeAsync(9000) })

    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ estado: 'completado', procesados: 10 }))
  })

  it('no consulta cuando el id es null', async () => {
    const { result } = renderHook(() => useScanPolling(null, { intervalMs: 3000 }))

    await act(async () => { await vi.advanceTimersByTimeAsync(9000) })

    expect(result.current.escaneo).toBeNull()
    expect(result.current.isPolling).toBe(false)
    expect(result.current.terminal).toBe(false)
  })

  it('detiene el polling y expone el error cuando la consulta falla', async () => {
    falla = true
    const { result } = renderHook(() => useScanPolling('e1', { intervalMs: 3000 }))

    await act(async () => { await vi.advanceTimersByTimeAsync(0) })

    expect(result.current.error).toBe('Error de servidor')
    expect(result.current.isPolling).toBe(false)
    expect(result.current.terminal).toBe(false)
  })

  it('maneja el estado terminal error con errorDetalle', async () => {
    server.use(
      http.get('/api/escaneos-cumplimiento/e1', () =>
        HttpResponse.json(makeEscaneo({ estado: 'error', procesados: 4, errores: 1, errorDetalle: 'Falló el worker' })),
      ),
    )
    const { result } = renderHook(() => useScanPolling('e1', { intervalMs: 3000 }))

    await act(async () => { await vi.advanceTimersByTimeAsync(0) })

    expect(result.current.escaneo?.estado).toBe('error')
    expect(result.current.escaneo?.errorDetalle).toBe('Falló el worker')
    expect(result.current.terminal).toBe(true)
    expect(result.current.isPolling).toBe(false)
  })
})