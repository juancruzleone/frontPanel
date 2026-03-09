import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, AlertCircle, Wrench } from 'lucide-react'
import { useTheme } from '../../../shared/hooks/useTheme'
import HybridSelect from '../../../shared/components/HybridSelect/HybridSelect'
import styles from '../styles/modalRequestMaintenance.module.css'
import formButtonStyles from '../../../shared/components/Buttons/formButtons.module.css'
import type { Installation } from '../../installations/hooks/useInstallations'
import type { CreateMaintenanceRequestData } from '../services/maintenanceRequestsService'

interface ModalRequestMaintenanceProps {
  isOpen: boolean
  onClose: () => void
  installations: Installation[]
  onSubmit: (data: CreateMaintenanceRequestData) => Promise<{ message: string }>
  userInfo?: {
    nombre?: string
    email?: string
    telefono?: string
  }
}

const ModalRequestMaintenance: React.FC<ModalRequestMaintenanceProps> = ({
  isOpen,
  onClose,
  installations,
  onSubmit,
  userInfo
}) => {
  const { t } = useTranslation()
  const { dark } = useTheme()

  const [formData, setFormData] = useState<CreateMaintenanceRequestData>({
    titulo: '',
    descripcion: '',
    instalacionId: '',
    dispositivoId: null,
    prioridad: 'media',
    tipoProblema: 'falla_equipo',
    fechaPreferida: null,
    horaPreferida: null,
    contactoNombre: userInfo?.nombre || '',
    contactoTelefono: userInfo?.telefono || '',
    contactoEmail: userInfo?.email || '',
    observaciones: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedInstallation, setSelectedInstallation] = useState<Installation | null>(null)

  useEffect(() => {
    if (formData.instalacionId) {
      const installation = installations.find(i => i._id === formData.instalacionId)
      setSelectedInstallation(installation || null)
    } else {
      setSelectedInstallation(null)
    }
  }, [formData.instalacionId, installations])

  const handleChange = (field: keyof CreateMaintenanceRequestData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (touched[field]) {
      validateField(field, value)
    }
  }

  const handleBlur = (field: keyof CreateMaintenanceRequestData) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    validateField(field, formData[field])
  }

  const validateField = (field: keyof CreateMaintenanceRequestData, value: any) => {
    let error = ''

    switch (field) {
      case 'titulo':
        if (!value || value.trim().length < 5) {
          error = t('maintenanceRequests.validation.titleMin')
        }
        break
      case 'descripcion':
        if (!value || value.trim().length < 20) {
          error = t('maintenanceRequests.validation.descriptionMin')
        }
        break
      case 'instalacionId':
        if (!value) {
          error = t('maintenanceRequests.validation.installationRequired')
        }
        break
      case 'contactoNombre':
        if (!value || value.trim().length < 3) {
          error = t('maintenanceRequests.validation.nameMin')
        }
        break
      case 'contactoTelefono':
        if (!value || value.trim().length < 8) {
          error = t('maintenanceRequests.validation.phoneMin')
        }
        break
      case 'contactoEmail':
        if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = t('maintenanceRequests.validation.emailInvalid')
        }
        break
    }

    setErrors(prev => ({ ...prev, [field]: error }))
    return error === ''
  }

  const validateForm = () => {
    const fields: (keyof CreateMaintenanceRequestData)[] = [
      'titulo',
      'descripcion',
      'instalacionId',
      'contactoNombre',
      'contactoTelefono',
      'contactoEmail'
    ]

    let isValid = true

    fields.forEach(field => {
      if (!validateField(field, formData[field])) {
        isValid = false
      }
    })

    return isValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Marcar todos los campos como tocados
    const allFields = Object.keys(formData) as (keyof CreateMaintenanceRequestData)[]
    const newTouched = allFields.reduce((acc, field) => {
      acc[field] = true
      return acc
    }, {} as Record<string, boolean>)
    setTouched(newTouched)

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      await onSubmit(formData)
      handleClose()
    } catch (error: any) {
      setErrors(prev => ({
        ...prev,
        general: error.response?.data?.error || t('maintenanceRequests.error.createFailed')
      }))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
      titulo: '',
      descripcion: '',
      instalacionId: '',
      dispositivoId: null,
      prioridad: 'media',
      tipoProblema: 'falla_equipo',
      fechaPreferida: null,
      horaPreferida: null,
      contactoNombre: userInfo?.nombre || '',
      contactoTelefono: userInfo?.telefono || '',
      contactoEmail: userInfo?.email || '',
      observaciones: ''
    })
    setErrors({})
    setTouched({})
    setSelectedInstallation(null)
    onClose()
  }

  if (!isOpen) return null

  const prioridadOptions = [
    { value: 'baja', label: t('maintenanceRequests.priority.low') },
    { value: 'media', label: t('maintenanceRequests.priority.medium') },
    { value: 'alta', label: t('maintenanceRequests.priority.high') }
  ]

  const tipoProblemaOptions = [
    { value: 'falla_equipo', label: t('maintenanceRequests.problemType.equipmentFailure') },
    { value: 'mantenimiento_preventivo', label: t('maintenanceRequests.problemType.preventiveMaintenance') },
    { value: 'revision_general', label: t('maintenanceRequests.problemType.generalReview') },
    { value: 'actualizacion', label: t('maintenanceRequests.problemType.update') },
    { value: 'otro', label: t('maintenanceRequests.problemType.other') }
  ]

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div 
        className={`${styles.modal} ${styles.large} ${dark ? styles.dark : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2>
            <Wrench size={24} />
            {t('maintenanceRequests.modal.title')}
          </h2>
          <button
            onClick={handleClose}
            className={styles.closeButton}
            disabled={isSubmitting}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.body}>
            {/* Información General */}
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>
                {t('maintenanceRequests.section.generalInfo')}
              </h3>

              <div className={styles.formGroup}>
                <label>{t('maintenanceRequests.field.title')} *</label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => handleChange('titulo', e.target.value)}
                  onBlur={() => handleBlur('titulo')}
                  disabled={isSubmitting}
                  placeholder={t('maintenanceRequests.placeholder.title')}
                  className={touched.titulo && errors.titulo ? styles.errorInput : ''}
                />
                {touched.titulo && errors.titulo && (
                  <span className={styles.error}>{errors.titulo}</span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label>{t('maintenanceRequests.field.description')} *</label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => handleChange('descripcion', e.target.value)}
                  onBlur={() => handleBlur('descripcion')}
                  disabled={isSubmitting}
                  placeholder={t('maintenanceRequests.placeholder.description')}
                  rows={4}
                  className={touched.descripcion && errors.descripcion ? styles.errorInput : ''}
                />
                {touched.descripcion && errors.descripcion && (
                  <span className={styles.error}>{errors.descripcion}</span>
                )}
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>{t('maintenanceRequests.field.priority')} *</label>
                  <HybridSelect
                    name="prioridad"
                    value={formData.prioridad}
                    onChange={(value) => handleChange('prioridad', value)}
                    options={prioridadOptions}
                    disabled={isSubmitting}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>{t('maintenanceRequests.field.problemType')} *</label>
                  <HybridSelect
                    name="tipoProblema"
                    value={formData.tipoProblema}
                    onChange={(value) => handleChange('tipoProblema', value)}
                    options={tipoProblemaOptions}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </section>

            {/* Instalación y Dispositivo */}
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>
                {t('maintenanceRequests.section.location')}
              </h3>

              <div className={styles.formGroup}>
                <label>{t('maintenanceRequests.field.installation')} *</label>
                <HybridSelect
                  name="instalacionId"
                  value={formData.instalacionId}
                  onChange={(value) => handleChange('instalacionId', value)}
                  onBlur={() => handleBlur('instalacionId')}
                  options={[
                    { value: '', label: t('maintenanceRequests.placeholder.selectInstallation') },
                    ...installations.map(inst => ({
                      value: inst._id!,
                      label: `${inst.company} - ${inst.address}`
                    }))
                  ]}
                  disabled={isSubmitting}
                  error={!!(touched.instalacionId && errors.instalacionId)}
                />
                {touched.instalacionId && errors.instalacionId && (
                  <span className={styles.error}>{errors.instalacionId}</span>
                )}
              </div>

              {selectedInstallation && selectedInstallation.devices && selectedInstallation.devices.length > 0 && (
                <div className={styles.formGroup}>
                  <label>{t('maintenanceRequests.field.device')} ({t('common.optional')})</label>
                  <HybridSelect
                    name="dispositivoId"
                    value={formData.dispositivoId || ''}
                    onChange={(value) => handleChange('dispositivoId', value || null)}
                    options={[
                      { value: '', label: t('maintenanceRequests.placeholder.allInstallation') },
                      ...selectedInstallation.devices.map(dev => ({
                        value: dev._id!,
                        label: `${dev.nombre} - ${dev.ubicacion}`
                      }))
                    ]}
                    disabled={isSubmitting}
                  />
                </div>
              )}
            </section>

            {/* Fecha y Hora Preferida */}
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>
                {t('maintenanceRequests.section.schedule')}
              </h3>
              <p className={styles.sectionDescription}>
                {t('maintenanceRequests.section.scheduleDescription')}
              </p>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>
                    {t('maintenanceRequests.field.preferredDate')}
                  </label>
                  <input
                    type="date"
                    value={formData.fechaPreferida || ''}
                    onChange={(e) => handleChange('fechaPreferida', e.target.value || null)}
                    disabled={isSubmitting}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>
                    {t('maintenanceRequests.field.preferredTime')}
                  </label>
                  <input
                    type="time"
                    value={formData.horaPreferida || ''}
                    onChange={(e) => handleChange('horaPreferida', e.target.value || null)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </section>

            {/* Información de Contacto */}
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>
                {t('maintenanceRequests.section.contact')}
              </h3>

              <div className={styles.formGroup}>
                <label>
                  {t('maintenanceRequests.field.contactName')} *
                </label>
                <input
                  type="text"
                  value={formData.contactoNombre}
                  onChange={(e) => handleChange('contactoNombre', e.target.value)}
                  onBlur={() => handleBlur('contactoNombre')}
                  disabled={isSubmitting}
                  placeholder={t('maintenanceRequests.placeholder.contactName')}
                  className={touched.contactoNombre && errors.contactoNombre ? styles.errorInput : ''}
                />
                {touched.contactoNombre && errors.contactoNombre && (
                  <span className={styles.error}>{errors.contactoNombre}</span>
                )}
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>
                    {t('maintenanceRequests.field.contactPhone')} *
                  </label>
                  <input
                    type="tel"
                    value={formData.contactoTelefono}
                    onChange={(e) => handleChange('contactoTelefono', e.target.value)}
                    onBlur={() => handleBlur('contactoTelefono')}
                    disabled={isSubmitting}
                    placeholder={t('maintenanceRequests.placeholder.contactPhone')}
                    className={touched.contactoTelefono && errors.contactoTelefono ? styles.errorInput : ''}
                  />
                  {touched.contactoTelefono && errors.contactoTelefono && (
                    <span className={styles.error}>{errors.contactoTelefono}</span>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label>
                    {t('maintenanceRequests.field.contactEmail')} *
                  </label>
                  <input
                    type="email"
                    value={formData.contactoEmail}
                    onChange={(e) => handleChange('contactoEmail', e.target.value)}
                    onBlur={() => handleBlur('contactoEmail')}
                    disabled={isSubmitting}
                    placeholder={t('maintenanceRequests.placeholder.contactEmail')}
                    className={touched.contactoEmail && errors.contactoEmail ? styles.errorInput : ''}
                  />
                  {touched.contactoEmail && errors.contactoEmail && (
                    <span className={styles.error}>{errors.contactoEmail}</span>
                  )}
                </div>
              </div>
            </section>

            {/* Observaciones */}
            <section className={styles.section}>
              <div className={styles.formGroup}>
                <label>{t('maintenanceRequests.field.observations')}</label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => handleChange('observaciones', e.target.value)}
                  disabled={isSubmitting}
                  placeholder={t('maintenanceRequests.placeholder.observations')}
                  rows={3}
                />
              </div>
            </section>

            {errors.general && (
              <div className={styles.generalError}>
                <AlertCircle size={20} />
                {errors.general}
              </div>
            )}
          </div>

          <div className={formButtonStyles.actions}>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className={formButtonStyles.cancelButton}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={formButtonStyles.submitButton}
            >
              {isSubmitting ? t('common.sending') : t('maintenanceRequests.action.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ModalRequestMaintenance
