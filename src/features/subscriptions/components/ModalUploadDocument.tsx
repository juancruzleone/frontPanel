import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Upload, FileText, Trash2, Loader2 } from 'lucide-react'
import styles from '../styles/uploadDocument.module.css'
import { uploadBudgetDocument, type UploadDocumentData } from '../services/documentServices'

interface ModalUploadDocumentProps {
    isOpen: boolean
    onRequestClose: () => void
    installationId: string
    installationName: string
    onUploadSuccess: (message: string) => void
    onUploadError: (message: string) => void
}

const ModalUploadDocument: React.FC<ModalUploadDocumentProps> = ({
    isOpen,
    onRequestClose,
    installationId,
    installationName,
    onUploadSuccess,
    onUploadError,
}) => {
    const { t } = useTranslation()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [tipoDocumento, setTipoDocumento] = useState<'presupuesto' | 'contrato' | 'otro'>('contrato')
    const [descripcion, setDescripcion] = useState('')
    const [isUploading, setIsUploading] = useState(false)
    const [dragActive, setDragActive] = useState(false)

    // Reset form when modal closes
    useEffect(() => {
        if (!isOpen) {
            setSelectedFile(null)
            setTipoDocumento('contrato')
            setDescripcion('')
            setIsUploading(false)
            setDragActive(false)
        }
    }, [isOpen])

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    const handleBackdropClick = useCallback((e: React.MouseEvent) => {
        if (e.target === e.currentTarget && !isUploading) {
            onRequestClose()
        }
    }, [onRequestClose, isUploading])

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true)
        } else if (e.type === 'dragleave') {
            setDragActive(false)
        }
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0]
            if (file.type === 'application/pdf') {
                setSelectedFile(file)
            } else {
                onUploadError(t('subscriptions.documents.onlyPdfAllowed'))
            }
        }
    }, [t, onUploadError])

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            if (file.type === 'application/pdf') {
                setSelectedFile(file)
            } else {
                onUploadError(t('subscriptions.documents.onlyPdfAllowed'))
            }
        }
    }, [t, onUploadError])

    const handleRemoveFile = useCallback(() => {
        setSelectedFile(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!selectedFile) {
            onUploadError(t('subscriptions.documents.selectFile'))
            return
        }

        setIsUploading(true)

        try {
            const data: UploadDocumentData = {
                tipoDocumento,
                descripcion: descripcion.trim() || undefined,
                archivo: selectedFile,
            }

            await uploadBudgetDocument(installationId, data)
            onUploadSuccess(t('subscriptions.documents.uploadSuccess'))
            onRequestClose()
        } catch (error: any) {
            console.error('Error uploading document:', error)
            onUploadError(error.message || t('subscriptions.documents.uploadError'))
        } finally {
            setIsUploading(false)
        }
    }

    const handleClose = useCallback(() => {
        if (!isUploading) {
            onRequestClose()
        }
    }, [isUploading, onRequestClose])

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    if (!isOpen) return null

    return (
        <div className={styles.modalOverlay} onClick={handleBackdropClick}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>
                        {t('subscriptions.documents.uploadTitle')}
                    </h2>
                    <button
                        className={styles.closeButton}
                        onClick={handleClose}
                        disabled={isUploading}
                        aria-label={t('common.close')}
                        type="button"
                    >
                        ×
                    </button>
                </div>

                <div className={styles.modalContent}>
                    <div className={styles.installationInfo}>
                        <h3>{installationName}</h3>
                        <p>{t('subscriptions.documents.uploadSubtitle')}</p>
                    </div>

                    <form onSubmit={handleSubmit} className={styles.uploadForm}>
                        {/* Tipo de documento */}
                        <div className={styles.formGroup}>
                            <label className={styles.label}>
                                {t('subscriptions.documents.documentType')}
                            </label>
                            <select
                                value={tipoDocumento}
                                onChange={(e) => setTipoDocumento(e.target.value as 'presupuesto' | 'contrato' | 'otro')}
                                className={styles.select}
                                disabled={isUploading}
                            >
                                <option value="contrato">{t('subscriptions.documents.types.contract')}</option>
                                <option value="presupuesto">{t('subscriptions.documents.types.budget')}</option>
                                <option value="otro">{t('subscriptions.documents.types.other')}</option>
                            </select>
                        </div>

                        {/* Descripción */}
                        <div className={styles.formGroup}>
                            <label className={styles.label}>
                                {t('subscriptions.documents.description')}
                                <span className={styles.optional}>({t('common.optional')})</span>
                            </label>
                            <textarea
                                value={descripcion}
                                onChange={(e) => setDescripcion(e.target.value)}
                                className={styles.textarea}
                                placeholder={t('subscriptions.documents.descriptionPlaceholder')}
                                rows={3}
                                maxLength={500}
                                disabled={isUploading}
                            />
                        </div>

                        {/* Zona de arrastrar y soltar */}
                        <div className={styles.formGroup}>
                            <label className={styles.label}>
                                {t('subscriptions.documents.file')}
                            </label>

                            {!selectedFile ? (
                                <div
                                    className={`${styles.dropZone} ${dragActive ? styles.dropZoneActive : ''}`}
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload size={40} className={styles.uploadIcon} />
                                    <p className={styles.dropZoneText}>
                                        {t('subscriptions.documents.dragAndDrop')}
                                    </p>
                                    <p className={styles.dropZoneSubtext}>
                                        {t('subscriptions.documents.orClickToSelect')}
                                    </p>
                                    <p className={styles.dropZoneHint}>
                                        {t('subscriptions.documents.maxSize')}
                                    </p>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="application/pdf"
                                        onChange={handleFileSelect}
                                        className={styles.fileInput}
                                        disabled={isUploading}
                                    />
                                </div>
                            ) : (
                                <div className={styles.selectedFile}>
                                    <div className={styles.fileInfo}>
                                        <FileText size={24} className={styles.fileIcon} />
                                        <div className={styles.fileDetails}>
                                            <span className={styles.fileName}>{selectedFile.name}</span>
                                            <span className={styles.fileSize}>{formatFileSize(selectedFile.size)}</span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleRemoveFile}
                                        className={styles.removeFileButton}
                                        disabled={isUploading}
                                        aria-label={t('common.remove')}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Botones de acción */}
                        <div className={styles.modalActions}>
                            <button
                                type="submit"
                                className={styles.submitButton}
                                disabled={isUploading || !selectedFile}
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 size={18} className={styles.spinner} />
                                        {t('subscriptions.documents.uploading')}
                                    </>
                                ) : (
                                    <>
                                        <Upload size={18} />
                                        {t('subscriptions.documents.upload')}
                                    </>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={handleClose}
                                className={styles.cancelButton}
                                disabled={isUploading}
                            >
                                {t('common.cancel')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default ModalUploadDocument
