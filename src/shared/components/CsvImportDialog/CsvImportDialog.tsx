import { useState } from 'react'
import styles from './CsvImportDialog.module.css'

export interface CsvImportPreview {
  token: string
  payloadHash: string
  schemaVersion: string
  delimiter: ',' | ';'
  counts: { create: number, update: number, unchanged: number, error: number, warning?: number }
  rows: Array<{ row: number, externalId?: string, action: 'create' | 'update' | 'unchanged' | 'error', errors: string[], warnings: string[], stockDelta?: number }>
  expiresAt: string
}

interface CsvImportDialogProps {
  isOpen: boolean
  title: string
  labels: {
    chooseFile: string
    preview: string
    commit: string
    close: string
    errors: string
    result: string
  }
  onClose: () => void
  onPreview: (file: File) => Promise<CsvImportPreview>
  onCommit: (preview: CsvImportPreview) => Promise<unknown>
  onDownloadErrors: (token: string) => Promise<void>
  onCommitted: () => void
}

export const CsvImportDialog = ({ isOpen, title, labels, onClose, onPreview, onCommit, onDownloadErrors, onCommitted }: CsvImportDialogProps) => {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<CsvImportPreview | null>(null)
  const [result, setResult] = useState<unknown>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const run = async (operation: () => Promise<void>) => {
    setLoading(true)
    setError(null)
    try { await operation() } catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)) } finally { setLoading(false) }
  }

  const close = () => {
    if (loading) return
    setFile(null)
    setPreview(null)
    setResult(null)
    setError(null)
    onClose()
  }

  return (
    <div className={styles.backdrop} role="presentation">
      <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="csv-import-title">
        <header><h2 id="csv-import-title">{title}</h2><button type="button" onClick={close} aria-label={labels.close}>×</button></header>
        <div className={styles.content}>
          {!preview && <label className={styles.file}>{labels.chooseFile}<input type="file" accept=".csv,text/csv" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label>}
          {preview && (
            <>
              <div className={styles.counts}>
                <span>Create: {preview.counts.create}</span><span>Update: {preview.counts.update}</span>
                <span>Unchanged: {preview.counts.unchanged}</span><span>Error: {preview.counts.error}</span>
                {preview.counts.warning !== undefined && <span>Warning: {preview.counts.warning}</span>}
              </div>
               <div className={styles.tableScroll}><table><thead><tr><th>Row</th><th>externalId</th><th>Action</th><th>Delta</th><th>{labels.errors}</th></tr></thead><tbody>
                 {preview.rows.map((row) => <tr key={row.row}><td>{row.row}</td><td>{row.externalId || '-'}</td><td>{row.action}</td><td>{row.stockDelta ?? '-'}</td><td>{[...row.errors, ...row.warnings].join(', ') || '-'}</td></tr>)}
              </tbody></table></div>
            </>
          )}
          {error && <p role="alert" className={styles.error}>{error}</p>}
          {result && <p role="status">{labels.result}</p>}
        </div>
        <footer>
          <button type="button" onClick={close} disabled={loading}>{labels.close}</button>
          {!preview && <button type="button" disabled={!file || loading} onClick={() => run(async () => setPreview(await onPreview(file!)))}>{labels.preview}</button>}
          {preview && (preview.counts.error > 0 || preview.rows.some((row) => row.warnings.length > 0)) ? <button type="button" onClick={() => run(() => onDownloadErrors(preview.token))}>{labels.errors}</button> : null}
          {preview && <button type="button" disabled={preview.counts.error > 0 || loading || Boolean(result)} onClick={() => run(async () => { setResult(await onCommit(preview)); onCommitted() })}>{labels.commit}</button>}
        </footer>
      </section>
    </div>
  )
}
