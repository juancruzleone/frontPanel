import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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

const tourMocks = vi.hoisted(() => ({
  startTour: vi.fn(),
}))

vi.mock('../../../../src/features/compliance/hooks/useComplianceTour', () => ({
  useComplianceTour: () => ({
    tourCompleted: true,
    startTour: tourMocks.startTour,
  }),
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
    localStorage.setItem('onboarding-tour-v2-shown', 'true')
  })

  it('renders scan and authoring controls for administrators', async () => {
    renderView()

    expect(await screen.findByRole('heading', { name: /Historial anterior|Previous history/ })).toBeInTheDocument()
    expect((await screen.findAllByText('IRAM 3517')).length).toBeGreaterThan(0)
    expect(screen.getByText('Recarga cada 5 años')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Crear norma|Create standard/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Crear regla|Create rule/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ejecutar escaneo|Run scan/ })).toBeInTheDocument()
  })

  it('lets technicians run scans without showing authoring controls', async () => {
    useAuthStore.setState({ role: 'tecnico' })
    renderView()

    await screen.findAllByText('IRAM 3517')
    expect(screen.getByText('Recarga cada 5 años')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ejecutar escaneo|Run scan/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Crear norma|Create standard|Crear regla|Create rule|Editar|Edit|Eliminar|Delete/ })).not.toBeInTheDocument()
  })

  it('starts the compliance guide from the tutorial button', async () => {
    renderView()

    const tourButton = await screen.findByRole('button', { name: /Ver tutorial|View tutorial/ })
    fireEvent.click(tourButton)

    expect(tourMocks.startTour).toHaveBeenCalledTimes(1)
  })

  it('shows a translated error without exposing the service error detail', async () => {
    ;(services.fetchNormas as any).mockRejectedValue(new Error('internal tenant secret'))
    renderView()

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByRole('alert')).not.toHaveTextContent('internal tenant secret')
  })
})
