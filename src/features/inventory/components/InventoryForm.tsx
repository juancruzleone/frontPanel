import React, { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { validateInventoryForm, validateInventoryField } from "../validators/inventoryValidators"
import { InventoryItem, SupplierSnapshot } from "../types/inventory.types"
import styles from "../styles/inventoryForm.module.css"
import formButtonStyles from "../../../shared/components/Buttons/formButtons.module.css"
import { useSuppliers } from "../../suppliers/hooks/useSuppliers"

interface InventoryFormProps {
  initialData?: Partial<InventoryItem> | null
  onSubmit: (data: Partial<InventoryItem>) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

type InventoryFormData = Pick<InventoryItem, "name" | "unit" | "currentStock" | "minimumStock" | "category" | "location" | "code" | "active"> & {
  supplierId: string
}

export const InventoryForm: React.FC<InventoryFormProps> = ({ 
  initialData, 
  onSubmit, 
  onCancel,
  isLoading = false
}) => {
  const { t } = useTranslation()
  const { suppliers, loadSuppliers } = useSuppliers()
  const [formData, setFormData] = useState<InventoryFormData>({
    name: initialData?.name || "",
    unit: initialData?.unit || t("inventory.defaultUnit"),
    currentStock: initialData?.currentStock || 0,
    minimumStock: initialData?.minimumStock || 0,
    category: initialData?.category || "",
    location: initialData?.location || "",
    code: initialData?.code || "",
    active: initialData?.active ?? true,
    supplierId: initialData?.supplierSnapshot?.supplierId || "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  useEffect(() => {
    loadSuppliers({ limit: 1000 })
  }, [loadSuppliers])

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    let updatedValue: string | number | boolean = value
    if (type === "number") {
      updatedValue = Number(value)
    } else if (type === "checkbox") {
      updatedValue = (e.target as HTMLInputElement).checked
    }
    
    const updatedData = { ...formData, [name]: updatedValue }
    setFormData(updatedData)
    
    if (touched[name]) {
      const result = await validateInventoryField(name, updatedValue, t)
      setErrors(prev => ({ ...prev, [name]: result.isValid ? "" : result.error }))
    }
  }

  const handleBlur = async (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    let updatedValue: string | number | boolean = value
    if (type === "number") {
      updatedValue = Number(value)
    } else if (type === "checkbox") {
      updatedValue = (e.target as HTMLInputElement).checked
    }
    
    setTouched(prev => ({ ...prev, [name]: true }))
    const result = await validateInventoryField(name, updatedValue, t)
    setErrors(prev => ({ ...prev, [name]: result.isValid ? "" : result.error }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Mark all as touched
    const allTouched: Record<string, boolean> = {}
    Object.keys(formData).forEach(key => allTouched[key] = true)
    setTouched(allTouched)

    const validation = await validateInventoryForm(formData, t)
    if (!validation.isValid) {
      setErrors(validation.errors)
      return
    }

    try {
      const { supplierId, ...rest } = formData
      const submissionData: Partial<InventoryItem> = { ...rest }
      
      if (supplierId) {
        const selectedSupplier = suppliers.find(s => s._id === supplierId)
        if (selectedSupplier) {
          const supplierSnapshot: SupplierSnapshot = {
            supplierId: selectedSupplier._id,
            name: selectedSupplier.name,
            contactName: selectedSupplier.contactName,
            email: selectedSupplier.email,
            phone: selectedSupplier.phone,
          }
          submissionData.supplierSnapshot = supplierSnapshot
        }
      } else {
        submissionData.supplierSnapshot = null
      }

      await onSubmit(submissionData)
    } catch (err: unknown) {
      setErrors({ submit: err instanceof Error ? err.message : t("common.error") })
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
            onBlur={handleBlur}
            className={errors.name && touched.name ? styles.errorInput : ""}
            disabled={isLoading}
          />
          {errors.name && touched.name && <span className={styles.error}>{errors.name}</span>}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="unit">{t("inventory.unit")} *</label>
          <input
            id="unit"
            name="unit"
            type="text"
            value={formData.unit}
            onChange={handleChange}
            onBlur={handleBlur}
            className={errors.unit && touched.unit ? styles.errorInput : ""}
            disabled={isLoading}
          />
          {errors.unit && touched.unit && <span className={styles.error}>{errors.unit}</span>}
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
              onBlur={handleBlur}
              className={errors.currentStock && touched.currentStock ? styles.errorInput : ""}
              disabled={isLoading}
            />
            {errors.currentStock && touched.currentStock && <span className={styles.error}>{errors.currentStock}</span>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="minimumStock">{t("inventory.minimumStock")}</label>
            <input
              id="minimumStock"
              name="minimumStock"
              type="number"
              value={formData.minimumStock}
              onChange={handleChange}
              onBlur={handleBlur}
              className={errors.minimumStock && touched.minimumStock ? styles.errorInput : ""}
              disabled={isLoading}
            />
            {errors.minimumStock && touched.minimumStock && <span className={styles.error}>{errors.minimumStock}</span>}
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
            onBlur={handleBlur}
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
            onBlur={handleBlur}
            disabled={isLoading}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="code">{t("inventory.reference") || t("common.code")}</label>
          <input
            id="code"
            name="code"
            type="text"
            value={formData.code}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={isLoading}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="supplierId">{t("nav.suppliers")}</label>
          <select
            id="supplierId"
            name="supplierId"
            value={formData.supplierId}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={isLoading}
          >
            <option value="">{t("inventory.selectItem")}</option>
            {suppliers.map(supplier => (
              <option key={supplier._id} value={supplier._id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.checkboxGroup}>
          <input
            id="active"
            name="active"
            type="checkbox"
            checked={formData.active}
            onChange={handleChange}
            disabled={isLoading}
          />
          <label htmlFor="active">{t("common.active") || "Activo"}</label>
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
