import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../../../src/i18n'
import {
  ComplianceDashboard,
  buildResumenChartData,
} from '../../../../src/features/compliance/components/ComplianceDashboard'
import type { ResumenCumplimiento } from '../../../../src/features/compliance/services/complianceTypes'

const resumen: ResumenCumplimiento = {
  escaneoId: 'e1', estado: 'completado', totalResultados: 8,
  porEstado: { cumplido: 5, incumplido: 2, sin_evidencia: 1, error: 0 },
}

describe('buildResumenChartData', () => {
  it('devuelve lista vacía cuando no hay resumen', () => {
    expect(buildResumenChartData(null)).toEqual([])
  })

  it('mapea los cuatro estados con sus conteos', () => {
    const data = buildResumenChartData(resumen)
    expect(data).toEqual([
      { name: 'cumplido', value: 5, color: expect.any(String) },
      { name: 'incumplido', value: 2, color: expect.any(String) },
      { name: 'sin_evidencia', value: 1, color: expect.any(String) },
      { name: 'error', value: 0, color: expect.any(String) },
    ])
  })

  it('suma los valores al total del resumen', () => {
    const data = buildResumenChartData(resumen)
    const total = data.reduce((sum, item) => sum + item.value, 0)
    expect(total).toBe(8)
  })
})

describe('ComplianceDashboard', () => {
  it('muestra el título y el total de resultados', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <ComplianceDashboard resumen={resumen} />
      </I18nextProvider>,
    )

    expect(screen.getByText(/Resumen de cumplimiento|Compliance summary/)).toBeInTheDocument()
    expect(screen.getByText(/8/)).toBeInTheDocument()
  })

  it('muestra el estado vacío cuando no hay resumen', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <ComplianceDashboard resumen={null} />
      </I18nextProvider>,
    )

    expect(screen.getByText(/Aún no hay escaneos|No scans yet/)).toBeInTheDocument()
  })

  it('renderiza las etiquetas de estado con sus valores', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <ComplianceDashboard resumen={resumen} />
      </I18nextProvider>,
    )

    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })
})