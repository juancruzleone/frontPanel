import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { describe, expect, it, vi } from 'vitest'
import i18n from '../../../src/i18n'
import { CSV_MAX_FILE_BYTES, CsvImportDialog, type CsvImportPreview } from '../../../src/shared/components/CsvImportDialog/CsvImportDialog'

const base: CsvImportPreview = {
  token: 'opaque',
  payloadHash: 'hash',
  schemaVersion: 'suppliers.v1',
  delimiter: ',' as const,
  expiresAt: new Date('2030-01-01T10:30:00Z').toISOString(),
  counts: { create: 2, update: 1, unchanged: 3, error: 0 },
  rows: [],
}

const renderDialog = (props: Partial<Parameters<typeof CsvImportDialog>[0]> = {}) => {
  const defaultProps = {
    isOpen: true,
    title: 'Import',
    onClose: vi.fn(),
    onPreview: vi.fn().mockResolvedValue(base),
    onCommit: vi.fn().mockResolvedValue({ create: 2, update: 1, unchanged: 3, error: 0, warning: 1 }),
    onDownloadErrors: vi.fn().mockResolvedValue(undefined),
    onDownloadTemplate: vi.fn().mockResolvedValue(undefined),
    onCommitted: vi.fn(),
    ...props,
  }
  render(
    <I18nextProvider i18n={i18n}>
      <CsvImportDialog {...defaultProps} />
    </I18nextProvider>
  )
  return defaultProps
}

const chooseFile = (file: File) => {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  Object.defineProperty(input, 'files', { value: [file], configurable: true })
  fireEvent.change(input)
}

// Text-based button lookup: role queries trip over jsdom's limited CSS support
const findButton = async (pattern: RegExp) => {
  await waitFor(() => {
    const matches = Array.from(document.querySelectorAll('button')).filter((button) => pattern.test(button.textContent || ''))
    expect(matches.length).toBeGreaterThan(0)
  })
  return Array.from(document.querySelectorAll('button')).filter((button) => pattern.test(button.textContent || ''))[0]
}

describe('CsvImportDialog', () => {
  it('previews and commits a valid server preview, rendering real commit counts', async () => {
    const props = renderDialog()
    chooseFile(new File(['csv'], 'data.csv'))

    fireEvent.click(screen.getByText(/Previsualizar|Preview/))
    await waitFor(() => expect(props.onPreview).toHaveBeenCalledWith(expect.any(File)))

    fireEvent.click(screen.getByText(/Confirmar importación|Commit import/))
    expect(await screen.findByText(/Importación completada|Import completed/)).toBeInTheDocument()
    expect(props.onCommit).toHaveBeenCalledWith(base)

    const resultBlock = screen.getByText(/Importación completada|Import completed/).parentElement as HTMLElement
    expect(within(resultBlock).getByText(/Creados|Created/).textContent).toContain('2')
    expect(within(resultBlock).getByText(/Actualizados|Updated/).textContent).toContain('1')
    expect(within(resultBlock).getByText(/Sin cambios|Unchanged/).textContent).toContain('3')
  })

  it('disables commit and offers the errors CSV when the preview has errors', async () => {
    const props = renderDialog({
      onPreview: vi.fn().mockResolvedValue({
        ...base,
        counts: { create: 0, update: 0, unchanged: 0, error: 1 },
        rows: [{ row: 2, externalId: 'S-1', action: 'error' as const, errors: ['invalid'], warnings: [] }],
      }),
    })
    chooseFile(new File(['csv'], 'data.csv'))
    fireEvent.click(screen.getByText(/Previsualizar|Preview/))

    await waitFor(() => expect(screen.getByText(/Confirmar importación|Commit import/)).toBeDisabled())

    fireEvent.click(await findButton(/Descargar errores|Download errors/i))
    await waitFor(() => expect(props.onDownloadErrors).toHaveBeenCalledWith('opaque'))
  })

  it('offers the errors CSV when the preview has warnings only', async () => {
    const props = renderDialog({
      onPreview: vi.fn().mockResolvedValue({
        ...base,
        rows: [{ row: 2, externalId: 'I-1', action: 'update' as const, errors: [], warnings: ['initial stock ignored'], stockDelta: 0 }],
      }),
    })
    chooseFile(new File(['csv'], 'data.csv'))
    fireEvent.click(screen.getByText(/Previsualizar|Preview/))

    expect(await findButton(/Descargar errores|Download errors/i)).toBeInTheDocument()
    expect(screen.getByText('initial stock ignored')).toBeInTheDocument()
    void props
  })

  it('separates error badges from warning badges per row', async () => {
    renderDialog({
      onPreview: vi.fn().mockResolvedValue({
        ...base,
        rows: [
          { row: 1, externalId: 'A-1', action: 'error' as const, errors: ['bad value'], warnings: [] },
          { row: 2, externalId: 'A-2', action: 'update' as const, errors: [], warnings: ['stock ignored'] },
        ],
      }),
    })
    chooseFile(new File(['csv'], 'data.csv'))
    fireEvent.click(screen.getByText(/Previsualizar|Preview/))

    const errorBadge = await screen.findByText('bad value')
    const warningBadge = screen.getByText('stock ignored')
    expect(errorBadge.className).not.toBe(warningBadge.className)
    expect(errorBadge.closest('div')).not.toBe(warningBadge.closest('div'))
  })

  it('rejects files above 2MB before upload with a localized message', () => {
    renderDialog()
    chooseFile(new File([new ArrayBuffer(CSV_MAX_FILE_BYTES + 1)], 'big.csv', { type: 'text/csv' }))

    expect(screen.getByText(/supera el límite de 2 MB|exceeds the 2 MB limit/i)).toBeInTheDocument()
    expect(screen.getByText(/Previsualizar|Preview/)).toBeDisabled()
  })

  it('surfaces the localized preview expiry time', async () => {
    renderDialog()
    chooseFile(new File(['csv'], 'data.csv'))
    fireEvent.click(screen.getByText(/Previsualizar|Preview/))

    const expiry = await screen.findByText(/válida hasta|valid until/)
    expect(expiry.textContent).toMatch(/10:30/)
  })

  it('offers the template download inside the dialog before choosing a file', async () => {
    const props = renderDialog()

    fireEvent.click(screen.getByText(/Descarga la plantilla antes de importar|Download the template before importing/))
    await waitFor(() => expect(props.onDownloadTemplate).toHaveBeenCalledTimes(1))
  })

  it.each([
    ['assets', /templateExternalId.*tenant|templateExternalId.*plantilla/i],
    ['inventory', /supplierExternalId.*tenant|supplierExternalId.*proveedor/i],
    ['suppliers', /stable key|clave estable/i],
    ['installations', /all installations\.v1 fields|todos los campos de installations\.v1/i],
  ] as const)('renders typed %s guidance with explicit Excel rejection', (guidance, entityEvidence) => {
    renderDialog({ guidance })

    expect(screen.getByText(/XLS and XLSX|XLS y XLSX/i)).toBeInTheDocument()
    expect(screen.getByText(entityEvidence)).toBeInTheDocument()
    expect(document.querySelector('input[type="file"]')).toHaveAttribute('accept', '.csv,text/csv')
  })
})
