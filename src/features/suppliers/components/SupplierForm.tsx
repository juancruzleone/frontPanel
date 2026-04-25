import React, { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { validateSupplierForm } from "../validators/supplierValidators"
import styles from "../styles/supplierForm.module.css"
import formButtonStyles from "../../../shared/components/Buttons/formButtons.module.css"

interface SupplierFormData {
  name: string
  contactName?: string
  email?: string
  phone?: string
  address?: string
}

interface SupplierFormProps {
  initialData?: any
  onSubmit: (data: SupplierFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export const SupplierForm: React.FC<SupplierFormProps> = ({ 
  initialData, 
  onSubmit, 
  onCancel,
  isLoading = false 
}) => {
  const { t } = useTranslation()
  const isEdit = !!initialData
  
  const [formData, setFormData] = useState<SupplierFormData>({
    name: initialData?.name || "",
    contactName: initialData?.contactName || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    address: initialData?.address || "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        contactName: initialData.contactName || "",
        email: initialData.email || "",
        phone: initialData.phone || "",
        address: initialData.address || "",
      })
    }
  }, [initialData])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validation = await validateSupplierForm(formData, t)
    if (!validation.isValid) {
      setErrors(validation.errors)
      return
    }

    try {
      await onSubmit(formData)
    } catch (err: any) {
      setErrors({ submit: err.message })
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formContent}>
        <div className={styles.formGroup}>
          <label htmlFor="name">{t('suppliers.name')} *</label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            className={`${errors.name ? styles.errorInput : ""}`}
            placeholder={t('suppliers.name')}
            disabled={isLoading}
          />
          {errors.name && <span className={styles.error}>{errors.name}</span>}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="contactName">{t('suppliers.contactName')}</label>
          <input
            id="contactName"
            name="contactName"
            type="text"
            value={formData.contactName}
            onChange={handleChange}
            placeholder={t('suppliers.contactName')}
            disabled={isLoading}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="email">{t('suppliers.email')}</label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            className={`${errors.email ? styles.errorInput : ""}`}
            placeholder={t('suppliers.email')}
            disabled={isLoading}
          />
          {errors.email && <span className={styles.error}>{errors.email}</span>}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="phone">{t('suppliers.phone')}</label>
          <input
            id="phone"
            name="phone"
            type="text"
            value={formData.phone}
            onChange={handleChange}
            placeholder={t('suppliers.phone')}
            disabled={isLoading}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="address">{t('suppliers.address')}</label>
          <textarea
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder={t('suppliers.address')}
            disabled={isLoading}
            rows={3}
          />
        </div>
      </div>

      <div className={formButtonStyles.actions}>
        <button
          type="button"
          onClick={onCancel}
          className={formButtonStyles.cancelButton}
          disabled={isLoading}
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          className={formButtonStyles.submitButton}
          disabled={isLoading}
        >
          {isLoading ? t('common.loading') : t('common.save')}
        </button>
      </div>
      {errors.submit && <p className={styles.error}>{errors.submit}</p>}
    </form>
  )
}
