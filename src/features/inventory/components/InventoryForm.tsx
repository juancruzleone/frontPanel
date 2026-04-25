import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import { validateInventoryForm } from "../validators/inventoryValidators"
import { InventoryItem } from "../types/inventory.types"
import styles from "../styles/inventoryForm.module.css"
import formButtonStyles from "../../../shared/components/Buttons/formButtons.module.css"

interface InventoryFormProps {
  initialData?: Partial<InventoryItem> | null
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export const InventoryForm: React.FC<InventoryFormProps> = ({ 
  initialData, 
  onSubmit, 
  onCancel,
  isLoading = false
}) => {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    unit: initialData?.unit || t("inventory.defaultUnit"),
    currentStock: initialData?.currentStock || 0,
    minimumStock: initialData?.minimumStock || 0,
    category: initialData?.category || "",
    location: initialData?.location || "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validation = await validateInventoryForm(formData, t)
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
          <label htmlFor="name">{t("inventory.name")} *</label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            className={errors.name ? styles.errorInput : ""}
            disabled={isLoading}
          />
          {errors.name && <span className={styles.error}>{errors.name}</span>}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="unit">{t("inventory.unit")} *</label>
          <input
            id="unit"
            name="unit"
            type="text"
            value={formData.unit}
            onChange={handleChange}
            className={errors.unit ? styles.errorInput : ""}
            disabled={isLoading}
          />
          {errors.unit && <span className={styles.error}>{errors.unit}</span>}
        </div>

        <div className={styles.grid}>
          <div className={styles.formGroup}>
            <label htmlFor="currentStock">{t("inventory.stock")}</label>
            <input
              id="currentStock"
              name="currentStock"
              type="number"
              value={formData.currentStock}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="minimumStock">{t("inventory.minimumStock")}</label>
            <input
              id="minimumStock"
              name="minimumStock"
              type="number"
              value={formData.minimumStock}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="category">{t("inventory.category")}</label>
          <input
            id="category"
            name="category"
            type="text"
            value={formData.category}
            onChange={handleChange}
            disabled={isLoading}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="location">{t("inventory.location")}</label>
          <input
            id="location"
            name="location"
            type="text"
            value={formData.location}
            onChange={handleChange}
            disabled={isLoading}
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
          {t("common.cancel")}
        </button>
        <button
          type="submit"
          className={formButtonStyles.submitButton}
          disabled={isLoading}
        >
          {isLoading ? t("common.saving") : t("common.save")}
        </button>
      </div>
      {errors.submit && <p className={styles.error}>{errors.submit}</p>}
    </form>
  )
}

