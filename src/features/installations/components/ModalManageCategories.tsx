import React from 'react'
import { X, Edit, Trash } from 'lucide-react'
import styles from '../styles/Modal.module.css'
import { useTranslation } from 'react-i18next'

interface Category {
  _id?: string
  nombre: string
  descripcion?: string
  createdAt?: string
}

interface ModalManageCategoriesProps {
  isOpen: boolean
  onRequestClose: () => void
  categories: Category[]
  onEdit?: (category: Category) => void
  onDelete?: (id: string) => void
}

const ModalManageCategories: React.FC<ModalManageCategoriesProps> = ({
  isOpen,
  onRequestClose,
  categories,
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
          <h2 className={styles.modalTitle}>{t('installations.deviceCategories')}</h2>
          <button className={styles.closeButton} onClick={onRequestClose}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {categories.length === 0 ? (
            <div className={styles.emptyState}>
              <p>{t('installations.noDeviceCategoriesCreated')}</p>
              <p className={styles.emptyStateSubtext}>
                {t('installations.categoriesWillAppearHere')}
              </p>
            </div>
          ) : (
            <div className={styles.listContainer}>
              {categories.map((category) => (
                <div key={category._id} className={styles.listItem}>
                  <div className={styles.itemInfo}>
                    <h3 className={styles.itemTitle}>{category.nombre}</h3>
                    {category.descripcion && (
                      <p className={styles.itemDescription}>{category.descripcion}</p>
                    )}
                    <p className={styles.itemDate}>
                      {t('installations.created')}: {formatDate(category.createdAt)}
                    </p>
                  </div>
                  
                  <div className={styles.itemActions}>
                    {onEdit && (
                      <button
                        className={styles.actionButton}
                        onClick={() => onEdit(category)}
                        aria-label={t('installations.editCategory')}
                      >
                        <Edit size={16} />
                      </button>
                    )}
                    {onDelete && category._id && (
                      <button
                        className={styles.actionButton}
                        onClick={() => onDelete(category._id!)}
                        aria-label={t('installations.deleteCategory')}
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

export default ModalManageCategories 