import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { useTheme } from '../../../shared/hooks/useTheme'
import ButtonCreate from '../../../shared/components/Buttons/buttonCreate'
import HybridSelect from '../../workOrders/components/HybridSelect'
import styles from '../styles/assetForm.module.css'
import formButtonStyles from '../../../shared/components/Buttons/formButtons.module.css'
import type { Asset, Template } from '../hooks/useAssets'
import { validateAssetForm, validateAssetField } from '../validators/assetValidations'

interface AssetFormProps {
  onCancel: () => void
  onSuccess: (message: string) => void
  onError: (message: string) => void
  onAdd?: (data: Asset) => Promise<{ message: string }>
  onEdit?: (id: string, data: Asset) => Promise<{ message: string }>
  isEditMode?: boolean
  initialData?: Asset | null
  templates: Template[]
  templatesLoading: boolean
  categories: string[]
}

const AssetForm = ({
  onCancel,
  onSuccess,
  onError,
  onAdd,
  onEdit,
  isEditMode = false,
  initialData,
  templates,
  templatesLoading,
  categories,
}: AssetFormProps) => {
  const { t } = useTranslation()
  const { dark } = useTheme()
  const [formData, setFormData] = useState<Omit<Asset, "_id">>({
    nombre: "",
    templateId: "",
    marca: "",
    modelo: "",
    numeroSerie: "",
  })

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({})
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const requiredFields = [
    { name: "nombre", label: t('assets.name') },
    { name: "templateId", label: t('assets.template') },
  ]

  // Inicializar formulario
  useEffect(() => {
    if (isEditMode && initialData) {
      setFormData({
        nombre: initialData.nombre || "",
        templateId: initialData.templateId || "",
        marca: initialData.marca || "",
        modelo: initialData.modelo || "",
        numeroSerie: initialData.numeroSerie || "",
      })

      // Encontrar la categoría de la plantilla actual
      const currentTemplate = templates.find((t) => t._id === initialData.templateId)
      if (currentTemplate) {
        setSelectedCategory(currentTemplate.categoria)
      }
    } else {
      // Resetear formulario para modo crear
      setFormData({
        nombre: "",
        templateId: "",
        marca: "",
        modelo: "",
        numeroSerie: "",
      })
      setSelectedCategory("")
    }

    setFormErrors({})
    setTouchedFields({})
  }, [isEditMode, initialData, templates])

  const handleFieldChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Limpiar error del campo cuando el usuario empiece a escribir
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const handleFieldBlur = async (fieldName: string) => {
    setTouchedFields((prev) => ({ ...prev, [fieldName]: true }))
    // Validar solo el campo que perdió el foco
    const value = formData[fieldName as keyof typeof formData]
    const result = await validateAssetField(fieldName, value, formData, t)
    setFormErrors((prev) => ({ ...prev, [fieldName]: result.isValid ? "" : result.error }))
  }

  const handleCategoryChange = (categoria: string) => {
    setSelectedCategory(categoria)

    // Limpiar la plantilla seleccionada cuando cambia la categoría
    if (formData.templateId) {
      const currentTemplate = templates.find((t) => t._id === formData.templateId)
      if (currentTemplate && currentTemplate.categoria !== categoria) {
        setFormData((prev) => ({ ...prev, templateId: "" }))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Marcar todos los campos como tocados para mostrar errores
    const allTouched: Record<string, boolean> = {}
    requiredFields.forEach(({ name }) => { allTouched[name] = true })
    setTouchedFields(allTouched)

    // Validar formulario
    const validation = await validateAssetForm(formData, t)
    if (!validation.isValid) {
      setFormErrors(validation.errors)
      setIsSubmitting(false)
      return
    }

    try {
      let message: string

      if (isEditMode && initialData?._id && onEdit) {
        const result = await onEdit(initialData._id, formData as Asset)
        message = result.message
      } else if (onAdd) {
        const result = await onAdd(formData as Asset)
        message = result.message
      } else {
        throw new Error("Función de guardado no proporcionada")
      }

      onSuccess(message)
    } catch (err: any) {
      console.error("Error al guardar activo:", err)
      onError(err.message || "Error al guardar el activo")
    } finally {
      setIsSubmitting(false)
    }
  }

  const showError = (fieldName: string) => touchedFields[fieldName] && formErrors[fieldName]

  const filteredTemplates = selectedCategory
    ? templates.filter((template) => template.categoria === selectedCategory)
    : templates

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formInner}>
        {/* Error general */}
        {formErrors.general && <div className={styles.generalError}>{formErrors.general}</div>}

        {/* Sección: Información Básica */}
        <h3 className={styles.sectionTitle}>{t('assets.basicInfo')}</h3>

        <div className={styles.formGroup}>
          <label>{t('assets.name')} *</label>
          <input
            type="text"
            name="nombre"
            value={formData.nombre || ""}
            onChange={(e) => handleFieldChange("nombre", e.target.value)}
            onBlur={() => handleFieldBlur("nombre")}
            disabled={isSubmitting}
            className={showError("nombre") ? styles.errorInput : ""}
            placeholder={t('assets.nombrePlaceholder')}
          />
          {showError("nombre") && <p className={styles.inputError}>{formErrors.nombre}</p>}
        </div>

        <div className={styles.formGroup}>
          <label>{t('assets.brand')} (Opcional)</label>
          <input
            type="text"
            name="marca"
            value={formData.marca || ""}
            onChange={(e) => handleFieldChange("marca", e.target.value)}
            disabled={isSubmitting}
            placeholder={t('assets.brandPlaceholder')}
          />
        </div>

        <div className={styles.formGroup}>
          <label>{t('assets.model')} (Opcional)</label>
          <input
            type="text"
            name="modelo"
            value={formData.modelo || ""}
            onChange={(e) => handleFieldChange("modelo", e.target.value)}
            disabled={isSubmitting}
            placeholder={t('assets.modelPlaceholder')}
          />
        </div>

        <div className={styles.formGroup}>
          <label>{t('assets.serialNumber')} (Opcional)</label>
          <input
            type="text"
            name="numeroSerie"
            value={formData.numeroSerie || ""}
            onChange={(e) => handleFieldChange("numeroSerie", e.target.value)}
            disabled={isSubmitting}
            placeholder={t('assets.serialNumberPlaceholder')}
          />
        </div>

        {/* Sección: Configuración */}
        <h3 className={styles.sectionTitle}>{t('assets.config')}</h3>

        {/* Filtro por categoría */}
        <div className={styles.formGroup}>
          <label>{t('assets.filterByTemplateCategory')}</label>
          <HybridSelect
            name="categoryFilter"
            value={selectedCategory}
            onChange={(value) => handleCategoryChange(value)}
            disabled={isSubmitting || templatesLoading}
            options={[
              { value: "", label: t('assets.allCategories') },
              ...categories.map((categoria) => ({
                value: String(categoria),
                label: String(categoria)
              }))
            ]}
            placeholder={t('assets.allCategories')}
            error={false}
          />
        </div>

        {/* Plantilla de formulario */}
        <div className={styles.formGroup}>
          <label>{t('assets.template')} *</label>
          {templatesLoading ? (
            <div className={styles.loadingMessage}>
              <div className={styles.spinner}></div>
              {t('assets.loadingTemplates')}
            </div>
          ) : (
            <HybridSelect
              name="templateId"
              value={formData.templateId || ""}
              onChange={(value) => handleFieldChange("templateId", value)}
              onBlur={() => handleFieldBlur("templateId")}
              disabled={isSubmitting}
              options={[
                { value: "", label: t('assets.selectTemplatePlaceholder') },
                ...filteredTemplates.map((template) => ({
                  value: String(template._id),
                  label: `${template.nombre} (${String(template.categoria)})`
                }))
              ]}
              placeholder={t('assets.selectTemplatePlaceholder')}
              error={!!showError("templateId")}
            />
          )}
          {showError("templateId") && <p className={styles.inputError}>{formErrors.templateId}</p>}

          {formData.templateId && (
            <div className={styles.templateInfo}>
              {(() => {
                const selectedTemplate = templates.find((t) => t._id === formData.templateId)
                return selectedTemplate ? (
                  <p className={styles.templateDescription}>
                    <strong>{t('assets.description')}:</strong> {selectedTemplate.descripcion || t('assets.noDescription')}
                    <br />
                    <strong>{t('assets.category')}:</strong> {t('assets.categories.' + selectedTemplate.categoria, { defaultValue: selectedTemplate.categoria })}
                    <br />
                    <strong>{t('assets.fields')}:</strong> {selectedTemplate.campos.length} {t('assets.fieldsCount')}
                  </p>
                ) : null
              })()}
            </div>
          )}
        </div>

        <div className={formButtonStyles.actions}>
          <button type="submit" disabled={isSubmitting || templatesLoading} className={formButtonStyles.submitButton}>
            {isSubmitting ? t('common.saving') : isEditMode ? t('assets.update') : t('assets.create')}
          </button>
          <button type="button" onClick={onCancel} disabled={isSubmitting} className={formButtonStyles.cancelButton}>
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </form>
  )
}

export default AssetForm
