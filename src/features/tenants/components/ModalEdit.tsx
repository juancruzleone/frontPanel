import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import TenantForm from './TenantForm'
import { Tenant, EditTenantData } from '../types/tenant.types'
import { tenantServices } from '../services/tenantServices'
import styles from '../styles/Modal.module.css'

interface ModalEditProps {
  isOpen: boolean
  tenant: Tenant | null
  onClose: () => void
  onSuccess: () => void
}

const ModalEdit: React.FC<ModalEditProps> = ({ isOpen, tenant, onClose, onSuccess }) => {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (data: EditTenantData) => {
    if (!tenant) return

    try {
      setIsLoading(true)
      await tenantServices.updateTenant({
        ...data,
        _id: tenant._id
      })
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error updating tenant:', error)
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
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div className={styles.titleSection}>
            <h2 className={styles.title}>{t('tenants.editTenant')}</h2>
          </div>
          <button
            onClick={handleCancel}
            className={styles.closeButton}
            disabled={isLoading}
          >
            <X size={24} />
          </button>
        </div>

        <div className={styles.modalContent}>
          <TenantForm
            tenant={tenant}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  )
}

export default ModalEdit 