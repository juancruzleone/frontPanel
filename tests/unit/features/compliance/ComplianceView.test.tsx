import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../../../src/i18n'
import { ComplianceView } from '../../../../src/features/compliance/components/ComplianceView'
import * as services from '../../../../src/features/compliance/services/complianceServices'
import { useAuthStore } from '../../../../src/store/authStore'
import { useComplianceStore } from '../../../../src/store/complianceStore'
import type { Norma, Regla, ResumenCumplimiento } from '../../../../src/features/compliance/services/complianceTypes'

vi.mock('../../../../src/features/compliance/services/complianceServices', () => ({
  fetchNormas: vi.fn(),
  createNorma: vi.fn(), updateNorma: vi.fn(), deleteNorma: vi.fn(),
  fetchReglas: vi.fn(),
  createRegla: vi.fn(), updateRegla: vi.fn(), deleteRegla: vi.fn(),
  triggerEscaneo: vi.fn(), fetchEscaneo: vi.fn(), fetchResumen: vi.fn(),
  fetchCatalogPacks: vi.fn(), fetchCatalogPack: vi.fn(), fetchAssignments: vi.fn(),
  createAssignment: vi.fn(), fetchCatalogRuns: vi.fn(), fetchCatalogRun: vi.fn(),
  fetchCatalogFindings: vi.fn(), startCatalogRun: vi.fn(),
}))

vi.mock('../../../../src/features/compliance/components/CatalogPackBrowser', () => ({
  CatalogPackBrowser: () => <div>Catalog packs</div>,
}))

vi.mock('../../../../src/features/compliance/components/ComplianceEvaluationsPanel', () => ({
  ComplianceEvaluationsPanel: () => <div>Evaluación Leonix</div>,
}))

const norma: Norma = { _id: 'n1', codigo: 'IRAM 3517', familiaNorma: 'IRAM', activa: true }
const regla: Regla = {
  _id: 'r1', normaId: 'n1', nombre: 'Recarga cada 5 años', operador: 'fechaAntiguaMeses',
  parametros: { meses: 60 }, objetivoTipo: 'activo', campoNombre: 'fechaRecarga', habilitada: true,
}
const resumen: ResumenCumplimiento = {
  escaneoId: 'e1', estado: 'completado', totalResultados: 8,
  porEstado: { cumplido: 5, incumplido: 2, sin_evidencia: 1, error: 0 },
}

const renderView = () => render(<I18nextProvider i18n={i18n}><ComplianceView /></I18nextProvider>)

describe('ComplianceView — legacy history', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(services.fetchNormas as any).mockResolvedValue([norma])
    ;(services.fetchReglas as any).mockResolvedValue([regla])
    ;(services.fetchResumen as any).mockResolvedValue(resumen)
    useComplianceStore.getState().clearAll()
    useAuthStore.setState({ role: 'admin', isAuthenticated: true, isAuthResolved: true })
  })

  it('renders historical standards and rules as read-only data for administrators', async () => {
    renderView()

    expect(await screen.findByRole('heading', { name: /Historial anterior|Previous history/ })).toBeInTheDocument()
    expect((await screen.findAllByText('IRAM 3517')).length).toBeGreaterThan(0)
    expect(screen.getByText('Recarga cada 5 años')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Crear norma|Create standard|Crear regla|Create rule|Editar|Edit|Eliminar|Delete|Ejecutar escaneo|Run scan/ })).not.toBeInTheDocument()
    expect(services.createNorma).not.toHaveBeenCalled()
    expect(services.createRegla).not.toHaveBeenCalled()
    expect(services.deleteNorma).not.toHaveBeenCalled()
    expect(services.deleteRegla).not.toHaveBeenCalled()
  })

  it('keeps the previous history read-only for technicians', async () => {
    useAuthStore.setState({ role: 'tecnico' })
    renderView()

    await screen.findAllByText('IRAM 3517')
    expect(screen.getByText('Recarga cada 5 años')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Crear|Create|Editar|Edit|Eliminar|Delete|Ejecutar escaneo|Run scan/ })).not.toBeInTheDocument()
  })

  it('shows a translated error without exposing the service error detail', async () => {
    ;(services.fetchNormas as any).mockRejectedValue(new Error('internal tenant secret'))
    renderView()

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByRole('alert')).not.toHaveTextContent('internal tenant secret')
  })
})
