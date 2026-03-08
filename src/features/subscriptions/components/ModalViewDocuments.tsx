import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { X, FileText, Trash2, Eye, Loader2, AlertCircle } from 'lucide-react'
import styles from '../styles/Modal.module.css'
import { getBudgetDocuments, deleteBudgetDocument, type BudgetDocument } from '../services/documentServices'
import ModalConfirmDelete from './ModalConfirmDelete'

interface ModalViewDocumentsProps {
    isOpen: boolean
    onRequestClose: () => void
    installationId: string
    installationName: string
    onError?: (message: string) => void
    onSuccess?: (message: string) => void
}

const ModalViewDocuments: React.FC<ModalViewDocumentsProps> = ({
    isOpen,
    onRequestClose,
    installationId,
    installationName,
    onError,
    onSuccess,
}) => {
    const { t } = useTranslation()
    const [documents, setDocuments] = useState<BudgetDocument[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [documentToDelete, setDocumentToDelete] = useState<BudgetDocument | null>(null)

    const fetchDocuments = useCallback(async () => {
        if (!installationId) return
        setLoading(true)
        setError(null)
        try {
            const docs = await getBudgetDocuments(installationId)
            setDocuments(docs)
        } catch (err: any) {
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

    const handleDeleteClick = (document: BudgetDocument) => {
        setDocumentToDelete(document)
        setIsDeleteModalOpen(true)
    }

    const handleConfirmDelete = async () => {
        if (!documentToDelete) return

        setDeletingId(documentToDelete._id)
        setIsDeleteModalOpen(false)
        try {
            await deleteBudgetDocument(installationId, documentToDelete._id)
            setDocuments(prev => prev.filter(doc => doc._id !== documentToDelete._id))
            if (onSuccess) {
                onSuccess(t('subscriptions.documents.deleteSuccess') || 'Documento eliminado correctamente')
            }
        } catch (err: any) {
            if (onError) {
                onError(err.message || t('subscriptions.documents.errorDeleting'))
            } else {
                alert(err.message || t('subscriptions.documents.errorDeleting'))
            }
        } finally {
            setDeletingId(null)
            setDocumentToDelete(null)
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
        <div className={styles.backdrop} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <div className={styles.titleSection}>
                        <h2 className={styles.title}>
                            {t('subscriptions.documents.viewTitle') || 'Documentos guardados'}
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

                        </div>
                    ) : error ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '16px', color: 'var(--color-danger)' }}>
                            <AlertCircle size={40} />
                            <p>{error}</p>
                            <button onClick={fetchDocuments} className={styles.modalButton} style={{ width: 'auto' }}>
                                {t('common.retry')}
                            </button>
                        </div>
                    ) : documents.length === 0 ? (
                        <div className={styles.emptyStateContainer}>
                            <FileText size={48} className={styles.emptyStateIcon} />
                            <p className={styles.emptyStateText}>{t('subscriptions.documents.noDocumentsFound') || 'No se encontraron documentos'}</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '1.5rem 2.5rem' }}>
                            {documents.map((doc) => {
                                // Adaptación para la estructura plana que devuelve la API
                                const fileName = doc.name || doc.metadata?.original_filename || t('subscriptions.documents.unnamedDocument')
                                const fileSize = doc.size || doc.metadata?.bytes || 0
                                const fileUrl = doc.url || doc.metadata?.secure_url

                                // Si no hay URL, no podemos mostrarlo
                                if (!fileUrl) return null

                                return (
                                    <div key={doc._id} className={styles.selectedFile} style={{ cursor: 'default' }}>
                                        <div className={styles.fileInfo}>
                                            <FileText size={24} className={styles.fileIcon} />
                                            <div className={styles.fileDetails}>
                                                <span className={styles.fileName}>{fileName}</span>
                                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                    <span className={styles.fileSize}>{formatFileSize(fileSize)}</span>
                                                    <span className={styles.typeBadge}>
                                                        {t(`subscriptions.documents.types.${doc.tipoDocumento}`, {
                                                            defaultValue: doc.tipoDocumento ? doc.tipoDocumento.charAt(0).toUpperCase() + doc.tipoDocumento.slice(1) : t('subscriptions.documents.types.other')
                                                        })}
                                                    </span>
                                                </div>
                                                {doc.descripcion && (
                                                    <p style={{ fontSize: '0.8rem', marginTop: '4px', opacity: 0.8 }}>{doc.descripcion}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <a
                                                href={fileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`${styles.fileActionButton} ${styles.viewFileButton}`}
                                                title={t('common.view')}
                                            >
                                                <Eye size={18} />
                                            </a>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteClick(doc)}
                                                className={`${styles.fileActionButton} ${styles.deleteFileButton}`}
                                                disabled={!!deletingId}
                                                aria-label={t('common.delete')}
                                                title={t('common.delete')}
                                            >
                                                {deletingId === doc._id ? <Loader2 size={18} className={styles.spinner} /> : <Trash2 size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            <ModalConfirmDelete
                isOpen={isDeleteModalOpen}
                onCancel={() => {
                    setIsDeleteModalOpen(false)
                    setDocumentToDelete(null)
                }}
                onConfirm={handleConfirmDelete}
                title={t('subscriptions.documents.confirmDeleteTitle') || t('common.confirmDelete')}
                description={t('subscriptions.documents.confirmDeleteDescription') || t('common.confirmDeleteDescription')}
            />
        </div>
    )
}

export default ModalViewDocuments 
