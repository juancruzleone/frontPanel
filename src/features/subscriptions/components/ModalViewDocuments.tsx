import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { X, FileText, Trash2, Eye, Loader2, Download, AlertCircle } from 'lucide-react'
import styles from '../styles/uploadDocument.module.css'
import { getBudgetDocuments, deleteBudgetDocument, type BudgetDocument } from '../services/documentServices'

interface ModalViewDocumentsProps {
    isOpen: boolean
    onRequestClose: () => void
    installationId: string
    installationName: string
}

const ModalViewDocuments: React.FC<ModalViewDocumentsProps> = ({
    isOpen,
    onRequestClose,
    installationId,
    installationName,
}) => {
    const { t, i18n } = useTranslation()
    const [documents, setDocuments] = useState<BudgetDocument[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const fetchDocuments = useCallback(async () => {
        if (!installationId) return
        setLoading(true)
        setError(null)
        try {
            const docs = await getBudgetDocuments(installationId)
            setDocuments(docs)
        } catch (err: any) {
            console.error('Error fetching documents:', err)
            setError(err.message || t('subscriptions.documents.errorFetching'))
        } finally {
            setLoading(false)
        }
    }, [installationId, t])

    useEffect(() => {
        if (isOpen) {
            fetchDocuments()
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen, fetchDocuments])

    const handleDelete = async (documentId: string) => {
        if (!window.confirm(t('common.confirmDelete'))) return

        setDeletingId(documentId)
        try {
            await deleteBudgetDocument(installationId, documentId)
            setDocuments(prev => prev.filter(doc => doc._id !== documentId))
        } catch (err: any) {
            console.error('Error deleting document:', err)
            alert(err.message || t('subscriptions.documents.errorDeleting'))
        } finally {
            setDeletingId(null)
        }
    }

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    if (!isOpen) return null

    return (
        <div className={styles.backdrop} onClick={onRequestClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
                <div className={styles.modalHeader}>
                    <div className={styles.titleSection}>
                        <h2 className={styles.title}>
                            {t('subscriptions.documents.viewTitle') || 'Documentos Guardados'}
                        </h2>
                        <p className={styles.installationInfo}>{installationName}</p>
                    </div>
                    <button
                        className={styles.closeButton}
                        onClick={onRequestClose}
                        aria-label={t('common.close')}
                        type="button"
                    >
                        ×
                    </button>
                </div>

                <div className={styles.modalContent} style={{ minHeight: '300px' }}>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '16px' }}>
                            <Loader2 size={40} className={styles.spinner} style={{ color: 'var(--color-secondary)' }} />
                            <p style={{ color: 'var(--color-text)', opacity: 0.7 }}>{t('common.loading')}</p>
                        </div>
                    ) : error ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '16px', color: 'var(--color-danger)' }}>
                            <AlertCircle size={40} />
                            <p>{error}</p>
                            <button onClick={fetchDocuments} className={styles.submitButton} style={{ width: 'auto' }}>
                                {t('common.retry')}
                            </button>
                        </div>
                    ) : documents.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '16px', color: 'var(--color-text-secondary)' }}>
                            <FileText size={48} opacity={0.3} />
                            <p>{t('subscriptions.documents.noDocumentsFound') || 'No se encontraron documentos'}</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {documents.map((doc) => (
                                <div key={doc._id} className={styles.selectedFile} style={{ cursor: 'default' }}>
                                    <div className={styles.fileInfo}>
                                        <FileText size={24} className={styles.fileIcon} />
                                        <div className={styles.fileDetails}>
                                            <span className={styles.fileName}>{doc.archivo.nombreOriginal}</span>
                                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                <span className={styles.fileSize}>{formatFileSize(doc.archivo.tamaño)}</span>
                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    padding: '2px 8px',
                                                    borderRadius: '10px',
                                                    background: 'var(--color-secondary)',
                                                    color: 'white',
                                                    fontWeight: 600
                                                }}>
                                                    {t(`subscriptions.documents.types.${doc.tipoDocumento}`)}
                                                </span>
                                            </div>
                                            {doc.descripcion && (
                                                <p style={{ fontSize: '0.8rem', marginTop: '4px', opacity: 0.8 }}>{doc.descripcion}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <a
                                            href={doc.archivo.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={styles.removeFileButton}
                                            style={{ color: 'var(--color-secondary)', borderColor: 'var(--color-secondary)' }}
                                            title={t('common.view')}
                                        >
                                            <Eye size={18} />
                                        </a>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(doc._id)}
                                            className={styles.removeFileButton}
                                            disabled={!!deletingId}
                                            aria-label={t('common.delete')}
                                            title={t('common.delete')}
                                        >
                                            {deletingId === doc._id ? <Loader2 size={18} className={styles.spinner} /> : <Trash2 size={18} />}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className={styles.modalFooter}>
                    <button
                        type="button"
                        onClick={onRequestClose}
                        className={styles.cancelButton}
                        style={{ width: '100%' }}
                    >
                        {t('common.close')}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ModalViewDocuments 
