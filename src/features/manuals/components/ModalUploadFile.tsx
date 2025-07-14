import { useState } from "react";
import { useTranslation } from "react-i18next";
import styles from "../styles/Modal.module.css";

interface ModalUploadFileProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onSubmit: (file: File) => Promise<void>;
  title?: string;
  description?: string;
}

const ModalUploadFile = ({
  isOpen,
  onRequestClose,
  onSubmit,
  title,
  description,
}: ModalUploadFileProps) => {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
        setError(null);
      } else {
        setError(t('manuals.selectPdfFile'));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError(t('manuals.selectFile'));
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(file);
      onRequestClose();
    } catch (err: any) {
      setError(err.message || t('manuals.uploadError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setError(null);
    onRequestClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.backdrop}>
      <div className={styles.uploadModal}>
        <div className={styles.uploadHeader}>
          <div className={styles.uploadIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="16" rx="2" fill="#3b82f6"/>
              <path d="M7 10l5-5 5 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 5v10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <button 
            className={styles.uploadCloseButton}
            onClick={handleClose}
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>
        
        <div className={styles.uploadContent}>
          <h2 className={styles.uploadTitle}>{title || t('manuals.uploadFile')}</h2>
          <p className={styles.uploadDescription}>{description || t('manuals.selectPdfFile')}</p>
          
          <form onSubmit={handleSubmit} className={styles.uploadForm}>
            <div className={styles.fileInputContainer}>
              <div className={styles.fileDropZone}>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                  className={styles.fileInput}
                  id="file-upload"
                />
                <label htmlFor="file-upload" className={styles.fileInputLabel}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className={styles.uploadIconSmall}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="#e5e7eb"/>
                    <polyline points="14,2 14,8 20,8" fill="#9ca3af"/>
                    <line x1="16" y1="13" x2="8" y2="13" stroke="#6b7280" strokeWidth="2"/>
                    <line x1="16" y1="17" x2="8" y2="17" stroke="#6b7280" strokeWidth="2"/>
                    <polyline points="10,9 9,9 8,9" stroke="#6b7280" strokeWidth="2"/>
                  </svg>
                  <span className={styles.fileInputText}>
                    {file ? t('manuals.changeFile') : t('manuals.selectPdfFile')}
                  </span>
                  <span className={styles.fileInputSubtext}>
                    {t('manuals.dragAndDrop')}
                  </span>
                </label>
              </div>
              
              {file && (
                <div className={styles.fileSelected}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={styles.fileIcon}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="#ef4444"/>
                    <polyline points="14,2 14,8 20,8" fill="#dc2626"/>
                    <text x="12" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">PDF</text>
                  </svg>
                  <div className={styles.fileInfo}>
                    <p className={styles.fileName}>{file.name}</p>
                    <p className={styles.fileSize}>
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setError(null);
                    }}
                    className={styles.removeFileButton}
                    disabled={isSubmitting}
                  >
                    ×
                  </button>
                </div>
              )}
              
              {error && (
                <div className={styles.errorMessage}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="#ef4444"/>
                    <path d="M15 9l-6 6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M9 9l6 6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  {error}
                </div>
              )}
            </div>

            <div className={styles.uploadActions}>
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className={styles.cancelButton}
              >
                {t('manuals.cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !file}
                className={styles.submitButton}
              >
                {isSubmitting ? (
                  <>
                    <svg className={styles.spinner} width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"/>
                      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    {t('manuals.uploading')}
                  </>
                ) : (
                  t('manuals.uploadFile')
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ModalUploadFile;