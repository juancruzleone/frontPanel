import type React from "react"
import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import type { Device, Installation } from "../hooks/useInstallations"
import styles from "../styles/modalAddDevice.module.css"
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
  const isEditMode = !!device

  // Inicializar formData según el modo
  const [formData, setFormData] = useState(() => {
    if (isEditMode && device) {
      return {
        assetId: device.assetId || "",
        nombre: device.nombre || "",
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
          nombre: formData.nombre,
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
          marca: selectedAsset.marca,
          modelo: selectedAsset.modelo,
          numeroSerie: selectedAsset.numeroSerie,
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

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formContent}>
        {!isEditMode && (
          <>
            <div className={styles.formGroup}>
              <label>{t('installations.asset')}*</label>
              <select
                value={formData.assetId}
                onChange={(e) => handleFieldChange("assetId", e.target.value)}
                onBlur={() => handleFieldBlur("assetId")}
                disabled={isSubmitting}
                className={showError("assetId") ? styles.errorInput : ""}
              >
                <option value="">{t('installations.selectAsset')}</option>
                {assets.map((asset) => (
                  <option key={asset._id} value={asset._id}>
                    {asset.nombre} - {asset.marca} {asset.modelo} (Serie: {asset.numeroSerie})
                  </option>
                ))}
              </select>
              {showError("assetId") && <p className={styles.error}>{formErrors.assetId}</p>}
            </div>

            {selectedAsset && (
              <div className={styles.assetInfo}>
                <h4>{t('installations.selectedAssetInfo')}:</h4>
                <p>
                  <strong>Nombre:</strong> {selectedAsset.nombre}
                </p>
                <p>
                  <strong>Marca:</strong> {selectedAsset.marca}
                </p>
                <p>
                  <strong>Modelo:</strong> {selectedAsset.modelo}
                </p>
                <p>
                  <strong>N° Serie:</strong> {selectedAsset.numeroSerie}
                </p>
              </div>
            )}
          </>
        )}

        {isEditMode && (
          <div className={styles.formGroup}>
            <label>{t('installations.deviceName')}*</label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={(e) => handleFieldChange("nombre", e.target.value)}
              onBlur={() => handleFieldBlur("nombre")}
              disabled={isSubmitting}
              className={showError("nombre") ? styles.errorInput : ""}
              placeholder={t('installations.deviceName')}
            />
            {showError("nombre") && <p className={styles.error}>{formErrors.nombre}</p>}
          </div>
        )}

        <div className={styles.formGroup}>
          <label>{t('installations.deviceLocation')}*</label>
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
          {showError("ubicacion") && <p className={styles.error}>{formErrors.ubicacion}</p>}
        </div>

        <div className={styles.formGroup}>
          <label>{t('installations.deviceCategory')}*</label>
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
            <select
              name="categoria"
              value={formData.categoria}
              onChange={(e) => handleFieldChange("categoria", e.target.value)}
              onBlur={() => handleFieldBlur("categoria")}
              disabled={isSubmitting}
              className={showError("categoria") ? styles.errorInput : ""}
            >
              <option value="">{t('installations.selectCategory')}</option>
              {categories.map((category) => (
                <option key={category._id} value={category.nombre}>
                  {category.nombre}
                  {category.descripcion && ` - ${category.descripcion}`}
                </option>
              ))}
            </select>
          )}
          {showError("categoria") && <p className={styles.error}>{formErrors.categoria}</p>}
        </div>

        {isEditMode && (
          <div className={styles.formGroup}>
            <label>{t('installations.deviceState')}*</label>
            <select
              name="estado"
              value={formData.estado}
              onChange={(e) => handleFieldChange("estado", e.target.value)}
              onBlur={() => handleFieldBlur("estado")}
              disabled={isSubmitting}
              className={showError("estado") ? styles.errorInput : ""}
            >
              {estadosDisponibles.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
            {showError("estado") && <p className={styles.error}>{formErrors.estado}</p>}
          </div>
        )}
      </div>

      {formErrors.general && <p className={styles.generalError}>{formErrors.general}</p>}

      <div className={styles.actions}>
        <button type="button" onClick={onCancel} disabled={isSubmitting} className={styles.cancelButton}>
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={isSubmitting || (!isEditMode && (!selectedAsset || !formData.categoria))}
          className={styles.submitButton}
        >
          {isSubmitting
            ? isEditMode
              ? t('common.updating')
              : t('common.adding')
            : isEditMode
              ? t('installations.updateDevice')
              : t('installations.addDevice')}
        </button>
      </div>
    </form>
  )
}

export default DeviceForm
