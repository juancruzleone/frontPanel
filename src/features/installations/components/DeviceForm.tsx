import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { useTheme } from '../../../shared/hooks/useTheme'
import HybridSelect from '../../workOrders/components/HybridSelect'
import styles from '../styles/deviceForm.module.css'
import formButtonStyles from '../../../shared/components/Buttons/formButtons.module.css'
import formCheckboxStyles from '../../../shared/components/Buttons/formCheckboxes.module.css'
import type { Device, Installation } from "../hooks/useInstallations"
import { validateForm, assetSchema, deviceEditSchema } from "../validators/deviceValidations"

interface DeviceFormProps {
  installation: Installation
  device?: Device | null // Opcional para modo edición
  onSubmitSuccess: (message: string) => void
  onAddDevice?: (installationId: string, device: Device) => Promise<{ message: string }>
  onUpdateDevice?: (installationId: string, deviceId: string, device: Partial<Device>) => Promise<{ message: string }>
  onCancel: () => void
  assets: any[]
  categories: any[]
  loadingCategories: boolean
  errorLoadingCategories: string | null
  onRetryLoadCategories: () => void
}

const DeviceForm = ({
  installation,
  device = null, // null para modo agregar, objeto para modo editar
  onSubmitSuccess,
  onAddDevice,
  onUpdateDevice,
  onCancel,
  assets,
  categories,
  loadingCategories,
  errorLoadingCategories,
  onRetryLoadCategories,
}: DeviceFormProps) => {
  const { t } = useTranslation()
  const { dark } = useTheme()
  const isEditMode = !!device

  // Inicializar formData según el modo
  const [formData, setFormData] = useState(() => {
    if (isEditMode && device) {
      return {
        assetId: device.assetId || "",
        ubicacion: device.ubicacion || "",
        categoria: device.categoria || "",
        estado: device.estado || "Activo",
      }
    }
    return {
      assetId: "",
      nombre: "",
      ubicacion: "",
      categoria: "",
      estado: "Activo",
    }
  })

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<any>(null)

  const estadosDisponibles = [t('installations.deviceStatus.active'), t('installations.deviceStatus.inactive'), t('installations.deviceStatus.maintenance'), t('installations.deviceStatus.outOfService'), t('installations.deviceStatus.pendingReview')]

  useEffect(() => {
    if (isEditMode) {
      // En modo edición, buscar el asset si existe assetId
      if (formData.assetId && assets.length > 0) {
        const asset = assets.find((a) => a._id === formData.assetId)
        setSelectedAsset(asset)
      }
    } else {
      // En modo agregar, buscar asset cuando cambie assetId
      if (formData.assetId) {
        const asset = assets.find((a) => a._id === formData.assetId)
        setSelectedAsset(asset)
      } else {
        setSelectedAsset(null)
      }
    }
  }, [formData.assetId, assets, isEditMode])

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (touchedFields[field]) {
      validateField(field, value)
    }
  }

  const validateField = async (field: string, value: string) => {
    try {
      const schema = isEditMode ? deviceEditSchema : assetSchema
      await schema.validateAt(field, { [field]: value })
      setFormErrors((prev) => ({ ...prev, [field]: "" }))
    } catch (err: any) {
      setFormErrors((prev) => ({ ...prev, [field]: err.message }))
    }
  }

  const handleFieldBlur = (field: string) => {
    if (!touchedFields[field]) {
      setTouchedFields((prev) => ({ ...prev, [field]: true }))
    }
    validateField(field, formData[field as keyof typeof formData])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const allFields = Object.keys(formData)
    const newTouchedFields = allFields.reduce(
      (acc, field) => {
        acc[field] = true
        return acc
      },
      {} as Record<string, boolean>,
    )
    setTouchedFields(newTouchedFields)

    const schema = isEditMode ? deviceEditSchema : assetSchema
    const validation = await validateForm(schema, formData)

    if (!validation.isValid) {
      setFormErrors(validation.errors)
      setIsSubmitting(false)
      return
    }

    try {
      if (isEditMode) {
        // Modo edición
        if (!device?._id || !onUpdateDevice) {
          throw new Error("Datos de dispositivo inválidos para edición")
        }

        const deviceData = {
          assetId: formData.assetId, // Mantener el assetId del dispositivo
          ubicacion: formData.ubicacion,
          categoria: formData.categoria,
          estado: formData.estado,
        }

        const result = await onUpdateDevice(installation._id!, device._id, deviceData)
        onSubmitSuccess(result.message)
      } else {
        // Modo agregar
        if (!selectedAsset || !onAddDevice) {
          throw new Error("El activo seleccionado no existe o falta la función de agregar")
        }

        const deviceData = {
          assetId: formData.assetId,
          nombre: selectedAsset.nombre,
          ubicacion: formData.ubicacion,
          categoria: formData.categoria,
          estado: selectedAsset.estado || "Activo",
          templateId: selectedAsset.templateId,
        }

        const result = await onAddDevice(installation._id!, deviceData)
        onSubmitSuccess(result.message)
      }

      // Reset form solo en modo agregar
      if (!isEditMode) {
        setFormData({
          assetId: "",
          nombre: "",
          ubicacion: "",
          categoria: "",
          estado: "Activo",
        })
        setFormErrors({})
        setTouchedFields({})
      }
    } catch (err: any) {
      setFormErrors({
        general:
          err.message ||
          `Error al ${isEditMode ? "actualizar" : "agregar"} el dispositivo. Por favor intente nuevamente.`,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const showError = (field: string) => touchedFields[field] && formErrors[field]
  const getErrorMessage = (field: string) => {
    const error = formErrors[field]
    if (!error) return null
    // Si el error es una clave de traducción, traducir
    if (error.startsWith('validations.')) return t(error)
    return error
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formContent}>
        {/* Información de la instalación */}
        <div className={styles.installationInfo}>
          <h4>{t('installations.deviceInstallationInfo')}:</h4>
          <p>
            <strong>{t('installations.company')}:</strong> {installation.company}
          </p>
          <p>
            <strong>{t('installations.address')}:</strong> {installation.address}, {installation.city}, {installation.province}
          </p>
          {installation.installationType && (
            <p>
              <strong>{t('installations.installationType')}:</strong> {installation.installationType}
            </p>
          )}
        </div>

        {!isEditMode && (
          <>
            <div className={styles.formGroup}>
              <label>{t('installations.asset')}</label>
              <HybridSelect
                name="assetId"
                value={formData.assetId}
                onChange={(value) => handleFieldChange("assetId", value)}
                onBlur={() => handleFieldBlur("assetId")}
                disabled={isSubmitting}
                options={[
                  { value: "", label: t('installations.selectAsset') },
                  ...assets.map((asset) => ({
                    value: asset._id,
                    label: asset.nombre
                  }))
                ]}
                placeholder={t('installations.selectAsset')}
                error={!!showError("assetId")}
              />
              {showError("assetId") && <p className={styles.error}>{getErrorMessage("assetId")}</p>}
            </div>

            {selectedAsset && (
              <div className={styles.assetInfo}>
                <h4>{t('installations.selectedAssetInfo')}:</h4>
                <p>
                  <strong>{t('installations.assetName')}:</strong> {selectedAsset.nombre}
                </p>
              </div>
            )}
          </>
        )}


        <div className={styles.formGroup}>
          <label>{t('installations.deviceLocation')}</label>
          <input
            type="text"
            name="ubicacion"
            value={formData.ubicacion}
            onChange={(e) => handleFieldChange("ubicacion", e.target.value)}
            onBlur={() => handleFieldBlur("ubicacion")}
            disabled={isSubmitting}
            className={showError("ubicacion") ? styles.errorInput : ""}
            placeholder={t('installations.locationExample')}
          />
          {showError("ubicacion") && <p className={styles.error}>{getErrorMessage("ubicacion")}</p>}
        </div>

        <div className={styles.formGroup}>
          <label>{t('installations.deviceCategory')}</label>
          {loadingCategories ? (
            <p>{t('common.loading')}</p>
          ) : errorLoadingCategories ? (
            <div>
              <p className={styles.error}>
                {errorLoadingCategories.includes("No hay categorías")
                  ? errorLoadingCategories
                  : t('installations.errorLoadingCategories')}
              </p>
              <button type="button" onClick={onRetryLoadCategories} className={styles.retryButton}>
                {t('common.retry')}
              </button>
            </div>
          ) : categories.length === 0 ? (
            <p className={styles.error}>
              {t('installations.noCategoriesAvailable')}. {t('installations.createCategoriesFirst')}.
            </p>
          ) : (
            <HybridSelect
              name="categoria"
              value={formData.categoria}
              onChange={(value) => handleFieldChange("categoria", value)}
              onBlur={() => handleFieldBlur("categoria")}
              disabled={isSubmitting}
              options={[
                { value: "", label: t('installations.selectCategory') },
                ...categories.map((category) => ({
                  value: category.nombre,
                  label: `${category.nombre}${category.descripcion ? ` - ${category.descripcion}` : ''}`
                }))
              ]}
              placeholder={t('installations.selectCategory')}
              error={!!showError("categoria")}
            />
          )}
          {showError("categoria") && <p className={styles.error}>{getErrorMessage("categoria")}</p>}
        </div>

        {isEditMode && (
          <div className={styles.formGroup}>
            <label>{t('installations.deviceStatu')}</label>
            <HybridSelect
              name="estado"
              value={formData.estado}
              onChange={(value) => handleFieldChange("estado", value)}
              onBlur={() => handleFieldBlur("estado")}
              disabled={isSubmitting}
              options={estadosDisponibles.map((estado) => ({
                value: estado,
                label: estado
              }))}
              placeholder={t('installations.deviceStatu')}
              error={!!showError("estado")}
            />
            {showError("estado") && <p className={styles.error}>{getErrorMessage("estado")}</p>}
          </div>
        )}

        {formErrors.general && <p className={styles.generalError}>{formErrors.general}</p>}

        <div className={formButtonStyles.actions}>
          <button
            type="submit"
            disabled={isSubmitting}
            className={formButtonStyles.submitButton}
          >
            {isSubmitting ? t('common.saving') : isEditMode ? t('common.update') : t('common.create')}
          </button>
          <button type="button" onClick={onCancel} disabled={isSubmitting} className={formButtonStyles.cancelButton}>
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </form>
  )
}

export default DeviceForm