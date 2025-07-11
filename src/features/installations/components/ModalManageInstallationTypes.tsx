import React from 'react'
import { X, Edit, Trash } from 'lucide-react'
import styles from '../styles/Modal.module.css'
import { useTranslation } from 'react-i18next'

interface InstallationType {
  _id?: string
  nombre: string
  descripcion?: string
  createdAt?: string
}

interface ModalManageInstallationTypesProps {
  isOpen: boolean
  onRequestClose: () => void
  installationTypes: InstallationType[]
  onEdit?: (type: InstallationType) => void
  onDelete?: (id: string) => void
}

const ModalManageInstallationTypes: React.FC<ModalManageInstallationTypesProps> = ({
  isOpen,
  onRequestClose,
  installationTypes,
  onEdit,
  onDelete
}) => {
  const { t } = useTranslation()
  if (!isOpen) return null

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className={styles.modalOverlay} onClick={onRequestClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{t('installations.installationTypes')}</h2>
          <button className={styles.closeButton} onClick={onRequestClose}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {installationTypes.length === 0 ? (
            <div className={styles.emptyState}>
              <p>{t('installations.noInstallationTypesCreated')}</p>
              <p className={styles.emptyStateSubtext}>
                {t('installations.installationTypesWillAppearHere')}
              </p>
            </div>
          ) : (
            <div className={styles.listContainer}>
              {installationTypes.map((type) => (
                <div key={type._id} className={styles.listItem}>
                  <div className={styles.itemInfo}>
                    <h3 className={styles.itemTitle}>{type.nombre}</h3>
                    {type.descripcion && (
                      <p className={styles.itemDescription}>{type.descripcion}</p>
                    )}
                    <p className={styles.itemDate}>
                      {t('installations.created')}: {formatDate(type.createdAt)}
                    </p>
                  </div>
                  
                  <div className={styles.itemActions}>
                    {onEdit && (
                      <button
                        className={styles.actionButton}
                        onClick={() => onEdit(type)}
                        aria-label={t('installations.editInstallationType')}
                      >
                        <Edit size={16} />
                      </button>
                    )}
                    {onDelete && type._id && (
                      <button
                        className={styles.actionButton}
                        onClick={() => onDelete(type._id!)}
                        aria-label={t('installations.deleteInstallationType')}
                      >
                        <Trash size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onRequestClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ModalManageInstallationTypes 