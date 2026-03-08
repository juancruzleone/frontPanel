import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Upload, FileText, Trash2, Loader2 } from 'lucide-react'
import styles from '../styles/Modal.module.css'
import formButtonStyles from '../../../shared/components/Buttons/formButtons.module.css'
import HybridSelect from '../../../shared/components/HybridSelect/HybridSelect'
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
    const [tipoDocumento, setTipoDocumento] = useState<string>('contract')
    const [descripcion, setDescripcion] = useState('')
    const [isUploading, setIsUploading] = useState(false)
    const [dragActive, setDragActive] = useState(false)
    const [fileError, setFileError] = useState<string>('')

    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB en bytes

    // Reset form when modal closes
    useEffect(() => {
        if (!isOpen) {
            setSelectedFile(null)
            setTipoDocumento('contract')
            setDescripcion('')
            setIsUploading(false)
            setDragActive(false)
            setFileError('')
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

    // Backdrop click disabled - modal only closes via close button or cancel
    const handleBackdropClick = useCallback((e: React.MouseEvent) => {
        // Do nothing - prevent closing on backdrop click
        e.stopPropagation()
    }, [])

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

            // Validar tipo de archivo
            if (file.type !== 'application/pdf') {
                setFileError(t('subscriptions.documents.onlyPdfAllowed'))
                return
            }

            // Validar tamaño del archivo
            if (file.size > MAX_FILE_SIZE) {
                setFileError(t('subscriptions.documents.fileTooLarge'))
                return
            }

            // Limpiar error y establecer archivo
            setFileError('')
            setSelectedFile(file)

            // Auto-fill description with file name if description is empty
            if (!descripcion.trim()) {
                setDescripcion(file.name.replace('.pdf', ''))
            }
        }
    }, [t, descripcion, MAX_FILE_SIZE])

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]

            // Validar tipo de archivo
            if (file.type !== 'application/pdf') {
                setFileError(t('subscriptions.documents.onlyPdfAllowed'))
                return
            }

            // Validar tamaño del archivo
            if (file.size > MAX_FILE_SIZE) {
                setFileError(t('subscriptions.documents.fileTooLarge'))
                return
            }

            // Limpiar error y establecer archivo
            setFileError('')
            setSelectedFile(file)

            // Auto-fill description with file name if description is empty
            if (!descripcion.trim()) {
                setDescripcion(file.name.replace('.pdf', ''))
            }
        }
    }, [t, descripcion, MAX_FILE_SIZE])

    const handleRemoveFile = useCallback(() => {
        setSelectedFile(null)
        setFileError('')
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!selectedFile) {
            setFileError(t('subscriptions.documents.selectFile'))
            return
        }

        // Validar tamaño antes de enviar
        if (selectedFile.size > MAX_FILE_SIZE) {
            setFileError(t('subscriptions.documents.fileTooLarge'))
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
        <div className={styles.backdrop} onClick={handleBackdropClick}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <div className={styles.titleSection}>
                        <h2 className={styles.title}>
                            {t('subscriptions.documents.uploadTitle')}
                        </h2>
                        <p className={styles.installationInfo}>{installationName}</p>
                    </div>
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
                    <form onSubmit={handleSubmit} className={styles.form} id="uploadForm">
                        <div className={styles.formInner}>
                            <div className={styles.formGroup}>
                                <label>
                                    {t('subscriptions.documents.documentType')}
                                </label>
                                <div className={styles.fullWidth} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <HybridSelect
                                        name="tipoDocumento"
                                        value={tipoDocumento === 'budget' || tipoDocumento === 'contract' ? tipoDocumento : 'other'}
                                        onChange={(value) => {
                                            if (value === 'other') {
                                                setTipoDocumento('other');
                                            } else {
                                                setTipoDocumento(value);
                                            }
                                        }}
                                        options={[
                                            { value: 'contract', label: t('subscriptions.documents.types.contract') },
                                            { value: 'budget', label: t('subscriptions.documents.types.budget') },
                                            { value: 'other', label: t('subscriptions.documents.types.other') }
                                        ]}
                                        disabled={isUploading}
                                        placeholder={t('subscriptions.documents.documentType')}
                                    />

                                    {(tipoDocumento === 'other' || (tipoDocumento !== 'budget' && tipoDocumento !== 'contract')) && (
                                        <input
                                            type="text"
                                            value={tipoDocumento === 'other' ? '' : tipoDocumento}
                                            onChange={(e) => setTipoDocumento(e.target.value)}
                                            placeholder={t('subscriptions.documents.specifyType') || "Especifique el tipo (ej: Factura)"}
                                            className={styles.textarea}
                                            style={{ minHeight: 'auto', padding: '0.75rem 1rem' }}
                                            disabled={isUploading}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Descripción */}
                            <div className={styles.formGroup}>
                                <label>
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
                                <label>
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

                                {/* Mensaje de error de validación */}
                                {fileError && (
                                    <p className={styles.inputError}>{fileError}</p>
                                )}
                            </div>
                        </div>

                        {/* Botones de acción */}
                        <div className={formButtonStyles.actions}>
                            <button
                                type="button"
                                onClick={handleClose}
                                className={formButtonStyles.cancelButton}
                                disabled={isUploading}
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                type="submit"
                                className={formButtonStyles.submitButton}
                                disabled={isUploading || !selectedFile}
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 size={18} className={styles.spinner} />
                                        {t('subscriptions.documents.uploading')}
                                    </>
                                ) : (
                                    t('subscriptions.documents.upload')
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default ModalUploadDocument
