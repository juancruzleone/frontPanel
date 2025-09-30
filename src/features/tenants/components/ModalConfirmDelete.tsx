import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, AlertTriangle } from 'lucide-react'
import { Tenant } from '../types/tenant.types'
import { tenantServices } from '../services/tenantServices'
import styles from '../styles/Modal.module.css'

interface ModalConfirmDeleteProps {
  isOpen: boolean
  tenant: Tenant | null
  onClose: () => void
  onSuccess: () => void
}

const ModalConfirmDelete: React.FC<ModalConfirmDeleteProps> = ({ 
  isOpen, 
  tenant, 
  onClose, 
  onSuccess 
}) => {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)

  const handleDelete = async () => {
    if (!tenant) return

    try {
      setIsLoading(true)
      await tenantServices.deleteTenant(tenant._id)
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error deleting tenant:', error)
      // Aquí podrías mostrar un toast de error
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    if (!isLoading) {
      onClose()
    }
  }

  if (!isOpen || !tenant) return null

  return (
    <div className={styles.backdrop}>
      <div className={styles.confirmModal}>
        <div className={styles.confirmHeader}>
          <div className={styles.warningIcon}>
            <AlertTriangle size={32} color="#ef4444" />
          </div>
          <button
            onClick={handleCancel}
            className={styles.confirmCloseButton}
            disabled={isLoading}
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.confirmContent}>
          <h3 className={styles.confirmTitle}>{t('tenants.confirmDeleteTitle')}</h3>
          <p className={styles.confirmDescription}>
            {t('tenants.confirmDeleteDescription')}
          </p>
          
          <div style={{ textAlign: 'left', marginBottom: '2rem' }}>
            <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', color: 'var(--color-text)', opacity: 0.8 }}>
              <strong>{t('tenants.name')}:</strong> {tenant.name}
            </p>
            <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', color: 'var(--color-text)', opacity: 0.8 }}>
              <strong>{t('tenants.subdomain')}:</strong> {tenant.subdomain}
            </p>
            <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', color: 'var(--color-text)', opacity: 0.8 }}>
              <strong>{t('tenants.email')}:</strong> {tenant.email}
            </p>
          </div>

          <div className={styles.confirmActions}>
            <button
              type="button"
              onClick={handleDelete}
              className={styles.deleteButton}
              disabled={isLoading}
            >
              {isLoading ? t('common.loading') : t('common.delete')}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className={styles.cancelButton}
              disabled={isLoading}
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModalConfirmDelete 