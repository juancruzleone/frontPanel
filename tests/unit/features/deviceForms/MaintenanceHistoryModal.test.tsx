import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MaintenanceHistoryModal from '../../../../src/features/deviceForms/components/MaintenanceHistoryModal'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

const showHistory = (pdfUrl: string) => {
  const onRequestClose = vi.fn()
  render(<MaintenanceHistoryModal
    isOpen onRequestClose={onRequestClose} deviceName="Bomba"
    maintenances={[{ _id: 'maintenance-1', date: '2026-01-01T12:00:00Z', pdfUrl, responses: { observaciones: 'Inspección completada' } }]}
  />)
  return onRequestClose
}

describe('MaintenanceHistoryModal URL policy', () => {
  beforeEach(() => vi.spyOn(window, 'open').mockReturnValue(null))
  afterEach(() => vi.restoreAllMocks())

  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'https://[invalid',
    'https://unapproved.example/report.pdf',
    'https://api.leonix.net.ar.evil.example/report.pdf',
    'http://api.leonix.net.ar/report.pdf',
    '//unapproved.example/report.pdf',
  ])('rejects PDF navigation for %s without altering the record', (url) => {
    const onRequestClose = showHistory(url)
    expect(screen.queryByRole('button', { name: 'maintenanceHistory.viewPDF' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('❌ PDF no disponible'))
    expect(window.open).not.toHaveBeenCalled()
    expect(onRequestClose).not.toHaveBeenCalled()
    expect(screen.getByText('Inspección completada')).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1)
  })

  it.each([
    `${window.location.origin}/reports/report.pdf`,
    'https://api.leonix.net.ar/report.pdf',
    'https://leonix.net.ar/report.pdf',
  ])('preserves allowed PDF opening for %s', (url) => {
    showHistory(url)
    fireEvent.click(screen.getByRole('button', { name: 'maintenanceHistory.viewPDF' }))
    expect(window.open).toHaveBeenCalledExactlyOnceWith(url, '_blank', 'noopener,noreferrer')
    expect(screen.queryByText('❌ PDF no disponible')).not.toBeInTheDocument()
    expect(screen.getByText('Inspección completada')).toBeInTheDocument()
  })

  it('normalizes a relative PDF URL before opening', () => {
    showHistory('/reports/report.pdf')
    fireEvent.click(screen.getByRole('button', { name: 'maintenanceHistory.viewPDF' }))
    expect(window.open).toHaveBeenCalledExactlyOnceWith(`${window.location.origin}/reports/report.pdf`, '_blank', 'noopener,noreferrer')
  })

  it('preserves the missing-PDF state', () => {
    showHistory('')
    expect(screen.getByText('❌ PDF no disponible')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'maintenanceHistory.viewPDF' })).not.toBeInTheDocument()
    expect(screen.getByText('Inspección completada')).toBeInTheDocument()
    expect(window.open).not.toHaveBeenCalled()
  })
})
