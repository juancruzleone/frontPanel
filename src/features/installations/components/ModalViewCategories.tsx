import { useEffect, useState } from "react"
import styles from "../styles/Modal.module.css"
import { fetchCategories } from "../services/categoryServices"
import { useTranslation } from "react-i18next"

interface Category {
  _id: string
  nombre: string
  descripcion?: string
  fechaCreacion: string
}

interface ModalViewCategoriesProps {
  isOpen: boolean
  onRequestClose: () => void
}

const ModalViewCategories = ({ isOpen, onRequestClose }: ModalViewCategoriesProps) => {
  const { t, i18n } = useTranslation()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadCategories()
    }
  }, [isOpen])

  const loadCategories = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchCategories()
      setCategories(data)
    } catch (err) {
      setError(t('installations.errorLoadingCategories'))
      console.error("Error loading categories:", err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(i18n.language, {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  if (!isOpen) return null

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>{t('installations.viewCategoriesTitle')}</h2>
          <button className={styles.closeButton} onClick={onRequestClose}>
            ×
          </button>
        </div>
        <div className={styles.modalContent}>
          {loading ? (
            <div className={styles.loadingMessage}>
              <div className={styles.spinner}></div>
              {t('installations.loadingCategories')}
            </div>
          ) : error ? (
            <div className={styles.generalError}>
              {t('installations.errorLoadingCategories')}
              <button onClick={loadCategories} className={styles.retryButton}>
                {t('common.retry')}
              </button>
            </div>
          ) : categories.length === 0 ? (
            <div className={styles.emptyState}>
              <p>{t('installations.noCategories')}</p>
              <p className={styles.emptyStateSubtext}>
                {t('installations.noCategoriesSubtext')}
              </p>
            </div>
          ) : (
            <div className={styles.listContainer}>
              {categories.map((category) => (
                <div key={category._id} className={styles.listItem}>
                  <div className={styles.itemInfo}>
                    <div className={styles.itemTitle}>{category.nombre}</div>
                    {category.descripcion && (
                      <div className={styles.itemDescription}>{category.descripcion}</div>
                    )}
                    <div className={styles.itemDate}>
                      {t('installations.created')}: {formatDate(category.fechaCreacion)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className={styles.actions}>
          <button className={styles.cancelButton} onClick={onRequestClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ModalViewCategories 