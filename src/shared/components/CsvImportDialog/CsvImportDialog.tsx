import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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

export interface CsvImportCommitResult {
  create?: number
  update?: number
  unchanged?: number
  error?: number
  warning?: number
  committedAt?: string
}

/** Backend rejects files above this size (csvUpload middleware cap). */
export const CSV_MAX_FILE_BYTES = 2 * 1024 * 1024

interface CsvImportDialogProps {
  isOpen: boolean
  title: string
  onClose: () => void
  onPreview: (file: File) => Promise<CsvImportPreview>
  onCommit: (preview: CsvImportPreview) => Promise<CsvImportCommitResult>
  onDownloadErrors: (token: string) => Promise<void>
  onCommitted: () => void
  /** Optional template download affordance shown before a file is selected. */
  onDownloadTemplate?: () => Promise<void>
}

const COMMIT_COUNT_KEYS = [
  ['create', 'created'],
  ['update', 'updated'],
  ['unchanged', 'unchanged'],
  ['error', 'errors'],
  ['warning', 'warnings'],
] as const

export const CsvImportDialog = ({ isOpen, title, onClose, onPreview, onCommit, onDownloadErrors, onCommitted, onDownloadTemplate }: CsvImportDialogProps) => {
  const { t, i18n } = useTranslation()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<CsvImportPreview | null>(null)
  const [result, setResult] = useState<CsvImportCommitResult | null>(null)
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

  const handleFileChange = (selected: File | null) => {
    setError(null)
    if (selected && selected.size > CSV_MAX_FILE_BYTES) {
      setFile(null)
      setError(t('csvImport.fileTooLarge'))
      return
    }
    setFile(selected)
  }

  const expiresAtLabel = preview?.expiresAt && !Number.isNaN(new Date(preview.expiresAt).getTime())
    ? new Date(preview.expiresAt).toLocaleString(i18n.language)
    : null

  return (
    <div className={styles.backdrop} role="presentation">
      <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="csv-import-title">
        <header><h2 id="csv-import-title">{title}</h2><button type="button" onClick={close} aria-label={t('csvImport.close')}>×</button></header>
        <div className={styles.content}>
          {!preview && (
            <>
              <label className={styles.file}>{t('csvImport.chooseFile')}<input type="file" accept=".csv,text/csv" onChange={(event) => handleFileChange(event.target.files?.[0] || null)} /></label>
              {onDownloadTemplate && (
                <p className={styles.templateHint}>
                  <button type="button" className={styles.templateLink} disabled={loading} onClick={() => run(onDownloadTemplate)}>
                    {t('csvImport.downloadTemplateFirst')}
                  </button>
                </p>
              )}
            </>
          )}
          {preview && (
            <>
              <div className={styles.counts}>
                <span>{t('csvImport.created')}: {preview.counts.create}</span><span>{t('csvImport.updated')}: {preview.counts.update}</span>
                <span>{t('csvImport.unchanged')}: {preview.counts.unchanged}</span><span className={styles.countError}>{t('csvImport.errors')}: {preview.counts.error}</span>
                {preview.counts.warning !== undefined && <span className={styles.countWarning}>{t('csvImport.warnings')}: {preview.counts.warning}</span>}
              </div>
              {expiresAtLabel && <p className={styles.expires}>{t('csvImport.expiresAt', { time: expiresAtLabel })}</p>}
              <div className={styles.tableScroll}><table><thead><tr><th>{t('csvImport.row')}</th><th>{t('csvImport.externalId')}</th><th>{t('csvImport.action')}</th><th>{t('csvImport.delta')}</th><th>{t('csvImport.errors')}</th></tr></thead><tbody>
                {preview.rows.map((row) => (
                  <tr key={row.row}>
                    <td>{row.row}</td>
                    <td>{row.externalId || '-'}</td>
                    <td>{row.action}</td>
                    <td>{row.stockDelta ?? '-'}</td>
                    <td className={styles.issueCell}>
                      {row.errors.length === 0 && row.warnings.length === 0 ? '-' : (
                        <>
                          {row.errors.length > 0 && (
                            <div className={styles.badges}>
                              {row.errors.map((issue, index) => <span key={`error-${index}`} className={`${styles.badge} ${styles.badgeError}`}>{issue}</span>)}
                            </div>
                          )}
                          {row.warnings.length > 0 && (
                            <div className={styles.badges}>
                              {row.warnings.map((issue, index) => <span key={`warning-${index}`} className={`${styles.badge} ${styles.badgeWarning}`}>{issue}</span>)}
                            </div>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody></table></div>
            </>
          )}
          {error && <p role="alert" className={styles.error}>{error}</p>}
          {loading && <div className={styles.busy} role="status"><span className={styles.spinner} aria-hidden="true" />{t('csvImport.processing')}</div>}
          {result && (
            <div role="status" className={styles.result}>
              <p>{t('csvImport.completed')}</p>
              <div className={styles.counts}>
                {COMMIT_COUNT_KEYS.map(([key, label]) => result[key] !== undefined && (
                  <span key={key} className={key === 'error' ? styles.countError : key === 'warning' ? styles.countWarning : undefined}>{t(`csvImport.${label}`)}: {result[key]}</span>
                ))}
              </div>
            </div>
          )}
        </div>
        <footer>
          <button type="button" onClick={close} disabled={loading}>{t('csvImport.close')}</button>
          {!preview && <button type="button" disabled={!file || loading} onClick={() => run(async () => setPreview(await onPreview(file!)))}>{t('csvImport.preview')}</button>}
          {preview && (preview.counts.error > 0 || preview.rows.some((row) => row.warnings.length > 0)) ? <button type="button" onClick={() => run(() => onDownloadErrors(preview.token))}>{t('csvImport.downloadErrors')}</button> : null}
          {preview && <button type="button" disabled={preview.counts.error > 0 || loading || Boolean(result)} onClick={() => run(async () => { setResult(await onCommit(preview)); onCommitted() })}>{t('csvImport.commit')}</button>}
        </footer>
      </section>
    </div>
  )
}
