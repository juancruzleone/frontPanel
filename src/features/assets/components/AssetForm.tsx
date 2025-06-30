import type React from "react"
import { useState, useEffect } from "react"
import type { Asset, Template } from "../hooks/useAssets"
import { validateAssetForm } from "../validators/assetValidations"
import styles from "../styles/assetForm.module.css"

interface AssetFormProps {
  onCancel: () => void
  onSuccess: (message: string) => void
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
  onAdd,
  onEdit,
  isEditMode = false,
  initialData,
  templates,
  templatesLoading,
  categories,
}: AssetFormProps) => {
  const [formData, setFormData] = useState<Omit<Asset, "_id">>({
    nombre: "",
    marca: "",
    modelo: "",
    numeroSerie: "",
    templateId: "",
  })

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({})
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const requiredFields = [
    { name: "nombre", label: "Nombre" },
    { name: "marca", label: "Marca" },
    { name: "modelo", label: "Modelo" },
    { name: "numeroSerie", label: "Número de Serie" },
    { name: "templateId", label: "Plantilla de Formulario" },
  ]

  // Inicializar formulario
  useEffect(() => {
    if (isEditMode && initialData) {
      setFormData({
        nombre: initialData.nombre || "",
        marca: initialData.marca || "",
        modelo: initialData.modelo || "",
        numeroSerie: initialData.numeroSerie || "",
        templateId: initialData.templateId || "",
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
        marca: "",
        modelo: "",
        numeroSerie: "",
        templateId: "",
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

  const handleFieldBlur = (fieldName: string) => {
    setTouchedFields((prev) => ({ ...prev, [fieldName]: true }))
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

    // Validar formulario
    const validation = await validateAssetForm(formData)
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
      setFormErrors({ general: err.message || "Error al guardar el activo" })
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
        <h3 className={styles.sectionTitle}>Información Básica</h3>

        {requiredFields.slice(0, 4).map(({ name, label }) => (
          <div className={styles.formGroup} key={name}>
            <label>{label} *</label>
            <input
              type="text"
              name={name}
              value={formData[name as keyof typeof formData] || ""}
              onChange={(e) => handleFieldChange(name, e.target.value)}
              onBlur={() => handleFieldBlur(name)}
              disabled={isSubmitting}
              className={showError(name) ? styles.errorInput : ""}
            />
            {showError(name) && <p className={styles.inputError}>{formErrors[name]}</p>}
          </div>
        ))}

        {/* Sección: Configuración */}
        <h3 className={styles.sectionTitle}>Configuración</h3>

        {/* Filtro por categoría */}
        <div className={styles.formGroup}>
          <label>Filtrar plantillas por categoría</label>
          <select
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            disabled={isSubmitting || templatesLoading}
          >
            <option value="">Todas las categorías</option>
            {categories.map((categoria) => (
              <option key={categoria} value={categoria}>
                {categoria}
              </option>
            ))}
          </select>
        </div>

        {/* Plantilla de formulario */}
        <div className={styles.formGroup}>
          <label>Plantilla de Formulario *</label>
          {templatesLoading ? (
            <div className={styles.loadingMessage}>
              <div className={styles.spinner}></div>
              Cargando plantillas...
            </div>
          ) : (
            <select
              name="templateId"
              value={formData.templateId || ""}
              onChange={(e) => handleFieldChange("templateId", e.target.value)}
              onBlur={() => handleFieldBlur("templateId")}
              disabled={isSubmitting}
              className={showError("templateId") ? styles.errorInput : ""}
            >
              <option value="">Seleccionar plantilla</option>
              {filteredTemplates.map((template) => (
                <option key={template._id} value={template._id}>
                  {template.nombre} ({template.categoria})
                </option>
              ))}
            </select>
          )}
          {showError("templateId") && <p className={styles.inputError}>{formErrors.templateId}</p>}

          {formData.templateId && (
            <div className={styles.templateInfo}>
              {(() => {
                const selectedTemplate = templates.find((t) => t._id === formData.templateId)
                return selectedTemplate ? (
                  <p className={styles.templateDescription}>
                    <strong>Descripción:</strong> {selectedTemplate.descripcion || "Sin descripción"}
                    <br />
                    <strong>Categoría:</strong> {selectedTemplate.categoria}
                    <br />
                    <strong>Campos:</strong> {selectedTemplate.campos.length} campo(s)
                  </p>
                ) : null
              })()}
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <button type="button" onClick={onCancel} disabled={isSubmitting} className={styles.cancelButton}>
            Cancelar
          </button>
          <button type="submit" disabled={isSubmitting || templatesLoading} className={styles.submitButton}>
            {isSubmitting ? "Guardando..." : isEditMode ? "Actualizar" : "Crear"}
          </button>
        </div>
      </div>
    </form>
  )
}

export default AssetForm
