import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import styles from "../styles/Modal.module.css"
import formButtonStyles from "../../../shared/components/Buttons/formButtons.module.css"
import type { Asset } from "../hooks/useAssets"

interface ModalStockProps {
  isOpen: boolean
  onRequestClose: () => void
  asset: Asset | null
  onUpdateStock: (assetId: string, stock: number) => Promise<void>
  onSuccess: (message: string) => void
  onError: (message: string) => void
}

const ModalStock = ({
  isOpen,
  onRequestClose,
  asset,
  onUpdateStock,
  onSuccess,
  onError,
}: ModalStockProps) => {
  const { t } = useTranslation()
  const [stock, setStock] = useState<number>(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (asset) {
      setStock(asset.stock || 0)
    }
  }, [asset])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!asset?._id) return

    if (stock < 0) {
      onError(t("assets.stock.validation.stockMin"))
      return
    }

    if (stock === 0) {
      onError(t("assets.stock.validation.stockZero"))
      return
    }

    setLoading(true)
    try {
      await onUpdateStock(asset._id, stock)
      onSuccess(t("assets.stock.stockUpdated"))
      onRequestClose()
    } catch (error: any) {
      onError(error.message || t("assets.stock.errorUpdatingStock"))
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>{t("assets.stock.manageStock")}</h2>
          <button 
            onClick={onRequestClose} 
            className={styles.closeButton} 
            aria-label={t("common.close")}
            disabled={loading}
          >
            ×
          </button>
        </div>

        <div className={styles.modalContent}>
          <form onSubmit={handleSubmit} className={styles.assignForm}>
            <div className={styles.assignFormInner}>
              <div className={styles.formGroup}>
                <label>{t("assets.stock.currentStock")}</label>
                <div style={{
                  background: 'var(--color-bg-light)',
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '2px solid var(--color-card-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '1.125rem', 
                    fontWeight: 600, 
                    color: 'var(--color-text)' 
                  }}>
                    {asset?.nombre}
                  </h3>
                  <p style={{ 
                    margin: 0, 
                    fontSize: '0.875rem', 
                    color: 'var(--color-text)', 
                    opacity: 0.7 
                  }}>
                    {t("assets.stock.currentStock")}: <strong style={{ 
                      color: 'var(--color-primary)', 
                      fontSize: '1rem' 
                    }}>{asset?.stock || 0}</strong>
                  </p>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="stock">{t("assets.stock.newStock")}</label>
                <input
                  type="number"
                  id="stock"
                  value={stock}
                  onChange={(e) => setStock(Number(e.target.value))}
                  min="1"
                  required
                  disabled={loading}
                  style={{
                    padding: '0.875rem 1rem',
                    border: '2px solid var(--color-card-border)',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    background: 'var(--color-card)',
                    color: 'var(--color-text)',
                    fontFamily: 'inherit',
                    width: '100%',
                    transition: 'all 0.3s ease'
                  }}
                  placeholder={t("assets.stock.stockPlaceholder")}
                />
                <span style={{ 
                  display: 'block', 
                  fontSize: '0.75rem', 
                  color: 'var(--color-text)', 
                  opacity: 0.6,
                  marginTop: '0.5rem' 
                }}>
                  {t("assets.stock.stockHint")}
                </span>
              </div>
            </div>

            <div className={formButtonStyles.actions} style={{ marginLeft: 0, marginRight: 0, marginBottom: 0 }}>
              <button 
                type="button" 
                onClick={onRequestClose} 
                className={formButtonStyles.cancelButton} 
                disabled={loading}
              >
                {t("common.cancel")}
              </button>
              <button 
                type="submit" 
                className={formButtonStyles.submitButton} 
                disabled={loading}
              >
                {loading ? t("common.updating") : t("common.update")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ModalStock
