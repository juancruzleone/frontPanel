import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import { validateInventoryForm } from "../validators/inventoryValidators"
import { InventoryItem } from "../types/inventory.types"

interface InventoryFormProps {
  initialData?: Partial<InventoryItem> | null
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
}

export const InventoryForm: React.FC<InventoryFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    unit: initialData?.unit || "unidades",
    currentStock: initialData?.currentStock || 0,
    minimumStock: initialData?.minimumStock || 0,
    category: initialData?.category || "",
    location: initialData?.location || "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    const validation = await validateInventoryForm(formData, t)
    if (!validation.isValid) {
      setErrors(validation.errors)
      setIsSubmitting(false)
      return
    }

    try {
      await onSubmit(formData)
    } catch (err: any) {
      setErrors({ submit: err.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col">
        <label htmlFor="name" className="text-sm font-medium text-gray-700">
          {t("inventory.name")}
        </label>
        <input
          id="name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
          className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
            errors.name ? "border-red-500" : "border-gray-300"
          }`}
        />
        {errors.name && <span className="text-xs text-red-500 mt-1">{errors.name}</span>}
      </div>

      <div className="flex flex-col">
        <label htmlFor="unit" className="text-sm font-medium text-gray-700">
          {t("inventory.unit")}
        </label>
        <input
          id="unit"
          name="unit"
          type="text"
          value={formData.unit}
          onChange={handleChange}
          className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
            errors.unit ? "border-red-500" : "border-gray-300"
          }`}
        />
        {errors.unit && <span className="text-xs text-red-500 mt-1">{errors.unit}</span>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col">
          <label htmlFor="currentStock" className="text-sm font-medium text-gray-700">
            {t("inventory.currentStock")}
          </label>
          <input
            id="currentStock"
            name="currentStock"
            type="number"
            value={formData.currentStock}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div className="flex flex-col">
          <label htmlFor="minimumStock" className="text-sm font-medium text-gray-700">
            {t("inventory.minimumStock")}
          </label>
          <input
            id="minimumStock"
            name="minimumStock"
            type="number"
            value={formData.minimumStock}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
      </div>

      <div className="flex flex-col">
        <label htmlFor="category" className="text-sm font-medium text-gray-700">
          {t("inventory.category")}
        </label>
        <input
          id="category"
          name="category"
          type="text"
          value={formData.category}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>

      <div className="flex justify-end space-x-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none"
        >
          {t("common.cancel")}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none disabled:opacity-50"
        >
          {isSubmitting ? t("common.saving") : t("common.save")}
        </button>
      </div>
      {errors.submit && <p className="text-sm text-red-500 mt-2">{errors.submit}</p>}
    </form>
  )
}
