import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ModalReportIncident from '../../../../src/features/incidents/components/ModalReportIncident'
import { incidentService } from '../../../../src/features/incidents/services/incidentServices'

vi.mock('../../../../src/features/incidents/services/incidentServices', () => ({
  incidentService: {
    reportIncident: vi.fn(),
  },
}))

describe('ModalReportIncident', () => {
  const mockInstallation = {
    _id: 'inst-001',
    company: 'Edificio Central',
    address: 'Av. Corrientes 1234',
  }

  const mockDevice = {
    _id: 'dev-001',
    nombre: 'Detector de humo — Piso 2',
    ubicacion: 'Piso 2, pasillo norte',
    categoria: 'Incendio',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('no renderiza nada cuando isOpen es false', () => {
    const { container } = render(
      <ModalReportIncident
        isOpen={false}
        onClose={vi.fn()}
        installation={mockInstallation}
        device={mockDevice}
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('muestra la información del dispositivo y de la instalación cuando está preseleccionado', () => {
    render(
      <ModalReportIncident
        isOpen={true}
        onClose={vi.fn()}
        installation={mockInstallation}
        device={mockDevice}
      />,
    )

    expect(screen.getByText('Detector de humo — Piso 2')).toBeInTheDocument()
    expect(screen.getByText(/Edificio Central/)).toBeInTheDocument()
  })

  it('copia el reporte de ejemplo al hacer clic en "Copiar reporte de ejemplo"', async () => {
    render(
      <ModalReportIncident
        isOpen={true}
        onClose={vi.fn()}
        installation={mockInstallation}
        device={mockDevice}
      />,
    )

    const copyBtn = screen.getByText('Copiar reporte de ejemplo')
    fireEvent.click(copyBtn)

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    expect(textarea.value.length).toBeGreaterThan(10)
    expect(textarea.value).toContain('Falla detectada en sensor principal')
  })

  it('permite cambiar la prioridad sugerida a Alta', () => {
    render(
      <ModalReportIncident
        isOpen={true}
        onClose={vi.fn()}
        installation={mockInstallation}
        device={mockDevice}
      />,
    )

    const altaBtn = screen.getByText('Alta')
    fireEvent.click(altaBtn)

    expect(altaBtn.className).toContain('priorityAltaActive')
  })

  it('envía el reporte con los datos cargados y notifica el éxito', async () => {
    const handleSubmitSuccess = vi.fn()
    const handleClose = vi.fn()

    vi.mocked(incidentService.reportIncident).mockResolvedValue({
      success: true,
      message: 'Incidencia reportada con éxito',
    })

    render(
      <ModalReportIncident
        isOpen={true}
        onClose={handleClose}
        installation={mockInstallation}
        device={mockDevice}
        onSubmitSuccess={handleSubmitSuccess}
      />,
    )

    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Se detectó fuga de agua en la válvula.' } })

    const submitBtn = screen.getByText('Enviar reporte')
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(incidentService.reportIncident).toHaveBeenCalledWith({
        instalacionId: 'inst-001',
        dispositivoId: 'dev-001',
        tipoIncidencia: 'falla_detectada',
        prioridadSugerida: 'media',
        descripcion: 'Se detectó fuga de agua en la válvula.',
        fotos: [],
        ordenPreventivaOrigenId: null,
      })
      expect(handleSubmitSuccess).toHaveBeenCalledWith('Incidencia reportada con éxito')
      expect(handleClose).toHaveBeenCalled()
    })
  })
})
