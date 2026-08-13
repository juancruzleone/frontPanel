import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CsvImportDialog } from '../../../src/shared/components/CsvImportDialog/CsvImportDialog'

const labels = { chooseFile: 'Choose', preview: 'Preview', commit: 'Commit', close: 'Close', errors: 'Errors', result: 'Completed' }
const base = { token: 'opaque', payloadHash: 'hash', schemaVersion: 'suppliers.v1', delimiter: ',' as const, expiresAt: new Date().toISOString(), rows: [] }

describe('CsvImportDialog', () => {
  it('previews and commits a valid server preview', async () => {
    const preview = { ...base, counts: { create: 1, update: 0, unchanged: 0, error: 0 } }
    const onPreview = vi.fn().mockResolvedValue(preview)
    const onCommit = vi.fn().mockResolvedValue(preview.counts)
    render(<CsvImportDialog isOpen title="Import" labels={labels} onClose={vi.fn()} onPreview={onPreview} onCommit={onCommit} onDownloadErrors={vi.fn()} onCommitted={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Choose'), { target: { files: [new File(['csv'], 'data.csv')] } })
    fireEvent.click(screen.getByText('Preview'))
    expect(await screen.findByText('Create: 1')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Commit'))
    expect(await screen.findByText('Completed')).toBeInTheDocument()
    expect(onCommit).toHaveBeenCalledWith(preview)
  })

  it('disables commit and offers error CSV when preview has errors', async () => {
    const preview = { ...base, counts: { create: 0, update: 0, unchanged: 0, error: 1 }, rows: [{ row: 2, externalId: 'S-1', action: 'error' as const, errors: ['invalid'], warnings: [], data: {} }] }
    const download = vi.fn().mockResolvedValue(undefined)
    render(<CsvImportDialog isOpen title="Import" labels={labels} onClose={vi.fn()} onPreview={vi.fn().mockResolvedValue(preview)} onCommit={vi.fn()} onDownloadErrors={download} onCommitted={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Choose'), { target: { files: [new File(['csv'], 'data.csv')] } })
    fireEvent.click(screen.getByText('Preview'))
    await waitFor(() => expect(screen.getByText('Commit').closest('button')).toBeDisabled())
    fireEvent.click(screen.getAllByText('Errors').find((element) => element.tagName === 'BUTTON')!)
    expect(download).toHaveBeenCalledWith('opaque')
  })

  it('offers the observations CSV when preview has warnings only', async () => {
    const preview = { ...base, counts: { create: 0, update: 1, unchanged: 0, error: 0 }, rows: [{ row: 2, externalId: 'I-1', action: 'update' as const, errors: [], warnings: ['initial stock ignored'], stockDelta: 0 }] }
    render(<CsvImportDialog isOpen title="Import" labels={labels} onClose={vi.fn()} onPreview={vi.fn().mockResolvedValue(preview)} onCommit={vi.fn()} onDownloadErrors={vi.fn()} onCommitted={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Choose'), { target: { files: [new File(['csv'], 'data.csv')] } })
    fireEvent.click(screen.getByText('Preview'))
    expect((await screen.findAllByText('Errors')).some((element) => element.tagName === 'BUTTON')).toBe(true)
    expect(screen.getByText('initial stock ignored')).toBeInTheDocument()
  })
})
