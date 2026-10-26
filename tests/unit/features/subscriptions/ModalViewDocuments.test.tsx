import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ModalViewDocuments from '../../../../src/features/subscriptions/components/ModalViewDocuments'
import { deleteBudgetDocument, getBudgetDocuments, type BudgetDocument } from '../../../../src/features/subscriptions/services/documentServices'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: translate }) }))
const translate = (key: string) => key
vi.mock('../../../../src/features/subscriptions/services/documentServices', () => ({
  getBudgetDocuments: vi.fn(),
  deleteBudgetDocument: vi.fn(),
}))

const rejectedUrls = [
  'javascript:alert(1)',
  'data:text/html,<script>alert(1)</script>',
  'https://[invalid',
  'https://unapproved.example/report.pdf',
  'https://api.leonix.net.ar.evil.example/report.pdf',
  'http://api.leonix.net.ar/report.pdf',
  '//unapproved.example/report.pdf',
  '',
]

const makeDocument = (url: string, source: 'url' | 'metadata'): BudgetDocument => ({
  _id: 'document-1', name: 'Presupuesto.pdf', url: source === 'url' ? url : '',
  type: 'application/pdf', size: 1024, tipoDocumento: 'presupuesto',
  uploadedBy: 'user-1', createdAt: '2026-01-01',
  ...(source === 'metadata' ? { metadata: {
    original_filename: 'Presupuesto.pdf', bytes: 1024, format: 'pdf', secure_url: url,
  } } : {}),
})

async function showDocument(url: string, source: 'url' | 'metadata' = 'url') {
  vi.mocked(getBudgetDocuments).mockResolvedValue([makeDocument(url, source)])
  await act(async () => {
    render(<ModalViewDocuments isOpen onRequestClose={vi.fn()} installationId="installation-1" installationName="Instalación" />)
  })
}

describe('ModalViewDocuments URL policy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'open').mockReturnValue(null)
    vi.mocked(deleteBudgetDocument).mockResolvedValue(undefined)
  })
  afterEach(() => vi.restoreAllMocks())

  describe.each(['url', 'metadata'] as const)('%s source', (source) => {
    it.each(rejectedUrls)('keeps deletion but no actionable link for %j', async (url) => {
      await showDocument(url, source)
      expect(screen.queryByRole('link')).not.toBeInTheDocument()
      expect(screen.getByText('Presupuesto.pdf')).toBeInTheDocument()
      const deleteButton = screen.getByRole('button', { name: 'common.delete' })
      expect(deleteButton).toBeEnabled()
      fireEvent.click(screen.getByText('Presupuesto.pdf'))
      fireEvent.click(deleteButton)
      expect(screen.getByText('subscriptions.documents.confirmDeleteTitle')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }))
      expect(screen.getByText('Presupuesto.pdf')).toBeInTheDocument()
      expect(deleteBudgetDocument).not.toHaveBeenCalled()
      expect(window.open).not.toHaveBeenCalled()
      expect(getBudgetDocuments).toHaveBeenCalledTimes(1)
    })

    it.each([
      '/documents/report.pdf',
      `${window.location.origin}/documents/report.pdf`,
      'https://api.leonix.net.ar/report.pdf',
      'https://leonix.net.ar/report.pdf',
    ])('preserves safe new-tab links for %s', async (url) => {
      await showDocument(url, source)
      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', new URL(url, window.location.origin).href)
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
      expect(link).toHaveAttribute('title', 'common.view')
      expect(screen.getByRole('button', { name: 'common.delete' })).toBeEnabled()
      expect(deleteBudgetDocument).not.toHaveBeenCalled()
    })
  })

  it('still deletes a rejected document only after explicit confirmation', async () => {
    await showDocument('https://unapproved.example/report.pdf')
    fireEvent.click(screen.getByRole('button', { name: 'common.delete' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'common.delete' })[1])
    await waitFor(() => expect(screen.getByText('subscriptions.documents.noDocumentsFound')).toBeInTheDocument())
    expect(deleteBudgetDocument).toHaveBeenCalledExactlyOnceWith('installation-1', 'document-1')
    expect(window.open).not.toHaveBeenCalled()
  })
})
