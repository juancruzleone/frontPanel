import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import TenantForm from './TenantForm'
import { CreateTenantData } from '../types/tenant.types'
import { tenantServices } from '../services/tenantServices'
import styles from '../styles/Modal.module.css'

interface ModalCreateProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const ModalCreate: React.FC<ModalCreateProps> = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (data: CreateTenantData) => {
    try {
      setIsLoading(true)
      await tenantServices.createTenant(data)
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error creating tenant:', error)
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

  if (!isOpen) return null

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div className={styles.titleSection}>
            <h2 className={styles.title}>{t('tenants.createTenant')}</h2>
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
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  )
}

export default ModalCreate 