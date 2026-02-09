import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Tenant, CreateTenantData, EditTenantData } from '../types/tenant.types'
import { validateField, ValidationErrors } from '../validators/tenantValidations'
import styles from '../styles/tenantForm.module.css'
import formButtonStyles from '../../../shared/components/Buttons/formButtons.module.css'

interface TenantFormProps {
  tenant?: Tenant
  onSubmit: (data: CreateTenantData | EditTenantData) => void
  onCancel: () => void
  isLoading?: boolean
}

const TenantForm: React.FC<TenantFormProps> = ({ 
  tenant, 
  onSubmit, 
  onCancel, 
  isLoading = false 
}) => {
  const { t } = useTranslation()
  const isEdit = !!tenant

  const [formData, setFormData] = useState<CreateTenantData | EditTenantData>({
    name: tenant?.name || '',
    subdomain: tenant?.subdomain || '',
    email: tenant?.email || '',
    phone: tenant?.phone || '',
    address: tenant?.address || '',
    plan: tenant?.plan || 'basic',
    maxUsers: tenant?.maxUsers || 10,
    maxAssets: tenant?.maxAssets || 100,
    ...(isEdit && { status: (tenant as EditTenantData)?.status || 'active' })
  })

  const [errors, setErrors] = useState<ValidationErrors>({})

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name,
        subdomain: tenant.subdomain,
        email: tenant.email,
        phone: tenant.phone || '',
        address: tenant.address || '',
        plan: tenant.plan,
        maxUsers: tenant.maxUsers,
        maxAssets: tenant.maxAssets,
        status: tenant.status
      })
    }
  }, [tenant])

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const handleBlur = (field: string) => {
    const error = validateField(field, formData[field as keyof typeof formData], isEdit)
    if (error) {
      setErrors(prev => ({
        ...prev,
        [field]: error
      }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validar todos los campos
    const newErrors: ValidationErrors = {}
    Object.keys(formData).forEach(field => {
      const error = validateField(field, formData[field as keyof typeof formData], isEdit)
      if (error) {
        newErrors[field] = error
      }
    })

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onSubmit(formData)
  }

  const translatePlan = (plan: string) => {
    switch (plan) {
      case 'basic':
        return t('tenants.planBasic')
      case 'professional':
        return t('tenants.planProfessional')
      case 'enterprise':
        return t('tenants.planEnterprise')
      default:
        return plan
    }
  }

  const translateStatus = (status: string) => {
    switch (status) {
      case 'active':
        return t('tenants.statusActive')
      case 'suspended':
        return t('tenants.statusSuspended')
      case 'cancelled':
        return t('tenants.statusCancelled')
      default:
        return status
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formContent}>
        {/* Nombre */}
        <div className={styles.formGroup}>
          <label htmlFor="name">
            {t('tenants.name')} *
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            onBlur={() => handleBlur('name')}
            className={`${errors.name ? styles.errorInput : ''}`}
            placeholder={t('tenants.namePlaceholder')}
            disabled={isLoading}
          />
          {errors.name && <span className={styles.error}>{errors.name}</span>}
        </div>

        {/* Subdominio */}
        <div className={styles.formGroup}>
          <label htmlFor="subdomain">
            {t('tenants.subdomain')} *
          </label>
          <input
            type="text"
            id="subdomain"
            value={formData.subdomain}
            onChange={(e) => handleInputChange('subdomain', e.target.value)}
            onBlur={() => handleBlur('subdomain')}
            className={`${errors.subdomain ? styles.errorInput : ''}`}
            placeholder={t('tenants.subdomainPlaceholder')}
            disabled={isLoading || isEdit}
          />
          {errors.subdomain && <span className={styles.error}>{errors.subdomain}</span>}
        </div>

        {/* Email */}
        <div className={styles.formGroup}>
          <label htmlFor="email">
            {t('tenants.email')} *
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            onBlur={() => handleBlur('email')}
            className={`${errors.email ? styles.errorInput : ''}`}
            placeholder={t('tenants.emailPlaceholder')}
            disabled={isLoading}
          />
          {errors.email && <span className={styles.error}>{errors.email}</span>}
        </div>

        {/* Teléfono */}
        <div className={styles.formGroup}>
          <label htmlFor="phone">
            {t('tenants.phone')}
          </label>
          <input
            type="tel"
            id="phone"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            onBlur={() => handleBlur('phone')}
            className={`${errors.phone ? styles.errorInput : ''}`}
            placeholder={t('tenants.phonePlaceholder')}
            disabled={isLoading}
          />
          {errors.phone && <span className={styles.error}>{errors.phone}</span>}
        </div>

        {/* Dirección */}
        <div className={styles.formGroup}>
          <label htmlFor="address">
            {t('tenants.address')}
          </label>
          <textarea
            id="address"
            value={formData.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            onBlur={() => handleBlur('address')}
            className={`${errors.address ? styles.errorInput : ''}`}
            placeholder={t('tenants.addressPlaceholder')}
            disabled={isLoading}
            rows={3}
          />
          {errors.address && <span className={styles.error}>{errors.address}</span>}
        </div>

        {/* Plan */}
        <div className={styles.formGroup}>
          <label htmlFor="plan">
            {t('tenants.plan')} *
          </label>
          <select
            id="plan"
            value={formData.plan}
            onChange={(e) => handleInputChange('plan', e.target.value)}
            onBlur={() => handleBlur('plan')}
            className={`${errors.plan ? styles.errorInput : ''}`}
            disabled={isLoading}
          >
            <option value="basic">{t('tenants.planBasic')}</option>
            <option value="professional">{t('tenants.planProfessional')}</option>
            <option value="enterprise">{t('tenants.planEnterprise')}</option>
          </select>
          {errors.plan && <span className={styles.error}>{errors.plan}</span>}
        </div>

        {/* Max Users */}
        <div className={styles.formGroup}>
          <label htmlFor="maxUsers">
            {t('tenants.maxUsers')} *
          </label>
          <input
            type="number"
            id="maxUsers"
            value={formData.maxUsers}
            onChange={(e) => handleInputChange('maxUsers', parseInt(e.target.value) || 0)}
            onBlur={() => handleBlur('maxUsers')}
            className={`${errors.maxUsers ? styles.errorInput : ''}`}
            min="1"
            max="1000"
            disabled={isLoading}
          />
          {errors.maxUsers && <span className={styles.error}>{errors.maxUsers}</span>}
        </div>

        {/* Max Assets */}
        <div className={styles.formGroup}>
          <label htmlFor="maxAssets">
            {t('tenants.maxAssets')} *
          </label>
          <input
            type="number"
            id="maxAssets"
            value={formData.maxAssets}
            onChange={(e) => handleInputChange('maxAssets', parseInt(e.target.value) || 0)}
            onBlur={() => handleBlur('maxAssets')}
            className={`${errors.maxAssets ? styles.errorInput : ''}`}
            min="1"
            max="10000"
            disabled={isLoading}
          />
          {errors.maxAssets && <span className={styles.error}>{errors.maxAssets}</span>}
        </div>

        {/* Status (solo para edición) */}
        {isEdit && (
          <div className={styles.formGroup}>
            <label htmlFor="status">
              {t('tenants.status')} *
            </label>
            <select
              id="status"
              value={(formData as EditTenantData).status || 'active'}
              onChange={(e) => handleInputChange('status', e.target.value)}
              onBlur={() => handleBlur('status')}
              className={`${errors.status ? styles.errorInput : ''}`}
              disabled={isLoading}
            >
              <option value="active">{t('tenants.statusActive')}</option>
              <option value="suspended">{t('tenants.statusSuspended')}</option>
              <option value="cancelled">{t('tenants.statusCancelled')}</option>
            </select>
            {errors.status && <span className={styles.error}>{errors.status}</span>}
          </div>
        )}
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
          {isLoading ? t('common.loading') : (isEdit ? t('common.update') : t('common.create'))}
        </button>
      </div>
    </form>
  )
}

export default TenantForm 