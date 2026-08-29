import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../../../src/i18n'
import { ComplianceView } from '../../../../src/features/compliance/components/ComplianceView'
import * as services from '../../../../src/features/compliance/services/complianceServices'
import { useAuthStore } from '../../../../src/store/authStore'
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
  fetchEscaneo: vi.fn(),
  fetchResumen: vi.fn(),
  fetchCatalogPacks: vi.fn(),
  fetchCatalogPack: vi.fn(),
  fetchAssignments: vi.fn(),
  createAssignment: vi.fn(),
  fetchCatalogRuns: vi.fn(),
  fetchCatalogRun: vi.fn(),
  fetchCatalogFindings: vi.fn(),
  startCatalogRun: vi.fn(),
}))

const norma: Norma = { _id: 'n1', codigo: 'IRAM 3517', familiaNorma: 'IRAM', activa: true }
const regla: Regla = {
  _id: 'r1', normaId: 'n1', nombre: 'Recarga cada 5 años', operador: 'fechaAntiguaMeses',
  parametros: { meses: 60 }, objetivoTipo: 'activo', campoNombre: 'fechaRecarga', habilitada: true,
}
const escaneoPendiente: Escaneo = {
  _id: 'e1', estado: 'pendiente', objetivosTotales: 0, procesados: 0, omitidos: 0,
  cumplidos: 0, incumplidos: 0, sinEvidencia: 0, errores: 0,
}
const resumen: ResumenCumplimiento = {
  escaneoId: 'e1', estado: 'completado', totalResultados: 8,
  porEstado: { cumplido: 5, incumplido: 2, sin_evidencia: 1, error: 0 },
}

const renderView = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <ComplianceView />
    </I18nextProvider>,
  )

describe('ComplianceView — role gating', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(services.fetchNormas as any).mockResolvedValue([norma])
    ;(services.fetchReglas as any).mockResolvedValue([regla])
    ;(services.fetchResumen as any).mockResolvedValue(resumen)
    useComplianceStore.getState().clearAll()
    useAuthStore.setState({ role: 'admin', isAuthenticated: true, isAuthResolved: true })
  })

  it('admin ve listas, creación y acciones de edición/eliminación', async () => {
    renderView()

    // IRAM 3517 aparece como norma y como código resuelto en la regla
    expect((await screen.findAllByText('IRAM 3517')).length).toBeGreaterThan(0)
    expect(screen.getByText('Recarga cada 5 años')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Crear norma|Create standard/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Crear regla|Create rule/ })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Editar|Edit/ }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /Eliminar|Delete/ }).length).toBeGreaterThan(0)
  })

  it('técnico NO ve ningún control de authoring pero sí escaneo y dashboard', async () => {
    useAuthStore.setState({ role: 'tecnico' })
    renderView()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Ejecutar escaneo|Run scan/ })).toBeInTheDocument()
    })

    expect(screen.getByText(/Resumen de cumplimiento|Compliance summary/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Crear norma|Create standard/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Crear regla|Create rule/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Editar|Edit/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Eliminar|Delete/ })).not.toBeInTheDocument()
    expect(screen.queryByText('IRAM 3517')).not.toBeInTheDocument()
  })

  it('admin crea una norma desde el modal', async () => {
    ;(services.createNorma as any).mockResolvedValue({ ...norma, codigo: 'AEA 90364' })
    renderView()

    fireEvent.click(await screen.findByRole('button', { name: /Crear norma|Create standard/ }))

    fireEvent.change(await screen.findByLabelText(/Código|Code/), { target: { value: 'AEA 90364' } })
    fireEvent.change(screen.getByLabelText(/Familia|family/), { target: { value: 'AEA' } })
    fireEvent.click(screen.getByRole('button', { name: /Guardar|Save/ }))

    await waitFor(() => {
      expect(services.createNorma).toHaveBeenCalledWith(
        expect.objectContaining({ codigo: 'AEA 90364', familiaNorma: 'AEA' }),
      )
    })
  })

  it('admin elimina una norma tras confirmar', async () => {
    ;(services.deleteNorma as any).mockResolvedValue({ success: true })
    renderView()

    const rowDeleteButtons = await screen.findAllByRole('button', { name: /Eliminar|Delete/ })
    fireEvent.click(rowDeleteButtons[0])

    // El botón de confirmación del modal es el último botón "Eliminar" del DOM
    const allButtons = await screen.findAllByRole('button', { name: /Eliminar|Delete/ })
    fireEvent.click(allButtons[allButtons.length - 1])

    await waitFor(() => {
      expect(services.deleteNorma).toHaveBeenCalledWith('n1')
    })
  })

  it('dispara el escaneo y refresca los estados al completar', async () => {
    ;(services.triggerEscaneo as any).mockResolvedValue(escaneoPendiente)
    ;(services.fetchEscaneo as any).mockResolvedValue({
      ...escaneoPendiente, estado: 'completado', objetivosTotales: 1, procesados: 1, cumplidos: 1,
    })
    renderView()

    fireEvent.click(await screen.findByRole('button', { name: /Ejecutar escaneo|Run scan/ }))

    await waitFor(() => {
      expect(screen.getByText(/Escaneo completado|Scan completed/)).toBeInTheDocument()
    })
    expect(services.fetchResumen).toHaveBeenCalled()
  })
})
