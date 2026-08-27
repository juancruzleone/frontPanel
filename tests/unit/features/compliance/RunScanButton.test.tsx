import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../../../src/i18n'
import { RunScanButton } from '../../../../src/features/compliance/components/RunScanButton'
import * as services from '../../../../src/features/compliance/services/complianceServices'
import { useComplianceStore } from '../../../../src/store/complianceStore'
import type { Escaneo } from '../../../../src/features/compliance/services/complianceTypes'

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
  fetchEscaneo: vi.fn(),
  fetchResumen: vi.fn(),
}))

const escaneoPendiente: Escaneo = {
  _id: 'e1', estado: 'pendiente', objetivosTotales: 0, procesados: 0, omitidos: 0,
  cumplidos: 0, incumplidos: 0, sinEvidencia: 0, errores: 0,
}
const escaneoCorriendo = (procesados: number): Escaneo => ({
  _id: 'e1', estado: 'corriendo', objetivosTotales: 10, procesados, omitidos: 0,
  cumplidos: 0, incumplidos: 0, sinEvidencia: 0, errores: 0,
})
const escaneoCompletado: Escaneo = {
  _id: 'e1', estado: 'completado', objetivosTotales: 10, procesados: 10, omitidos: 0,
  cumplidos: 6, incumplidos: 3, sinEvidencia: 1, errores: 0,
}

describe('RunScanButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    useComplianceStore.getState().clearAll()
    useComplianceStore.setState({ ownerId: 'owner-1' })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('dispara el escaneo, avanza el progreso y avisa al completar', async () => {
    ;(services.triggerEscaneo as any).mockResolvedValue(escaneoPendiente)
    ;(services.fetchEscaneo as any)
      .mockResolvedValueOnce(escaneoCorriendo(0))
      .mockResolvedValueOnce(escaneoCorriendo(4))
      .mockResolvedValue(escaneoCompletado)
    const onScanCompleted = vi.fn()

    render(
      <I18nextProvider i18n={i18n}>
        <RunScanButton onScanCompleted={onScanCompleted} />
      </I18nextProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Ejecutar escaneo|Run scan/ }))

    // tick inicial: corriendo 0/10
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(services.triggerEscaneo).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()

    // tick 2: corriendo 4/10
    await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40')

    // tick 3: completado 10/10 → terminal
    await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
    expect(screen.getByText(/Escaneo completado|Scan completed/)).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
    expect(onScanCompleted).toHaveBeenCalledTimes(1)
  })

  it('deshabilita el botón mientras hay un escaneo corriendo', async () => {
    ;(services.triggerEscaneo as any).mockResolvedValue(escaneoPendiente)
    ;(services.fetchEscaneo as any).mockResolvedValue(escaneoCorriendo(2))

    render(
      <I18nextProvider i18n={i18n}>
        <RunScanButton />
      </I18nextProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Ejecutar escaneo|Run scan/ }))
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })

    expect(screen.getByRole('button', { name: /Ejecutar escaneo|Run scan/ })).toBeDisabled()
  })

  it('muestra el mensaje de conflicto cuando ya hay un escaneo activo', async () => {
    ;(services.triggerEscaneo as any).mockRejectedValue(new Error('Ya hay un escaneo en ejecución'))

    render(
      <I18nextProvider i18n={i18n}>
        <RunScanButton />
      </I18nextProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Ejecutar escaneo|Run scan/ }))
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })

    expect(screen.getByText(/Ya hay un escaneo en ejecución/)).toBeInTheDocument()
  })

  it('muestra el detalle cuando el escaneo termina en error', async () => {
    ;(services.triggerEscaneo as any).mockResolvedValue(escaneoPendiente)
    ;(services.fetchEscaneo as any).mockResolvedValue({
      ...escaneoCorriendo(4), estado: 'error', errores: 2, errorDetalle: 'Falló el worker',
    })

    render(
      <I18nextProvider i18n={i18n}>
        <RunScanButton />
      </I18nextProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Ejecutar escaneo|Run scan/ }))
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })

    expect(screen.getByText(/Falló el worker/)).toBeInTheDocument()
  })
})