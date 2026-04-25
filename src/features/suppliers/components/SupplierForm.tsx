import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import { validateSupplierForm } from "../validators/supplierValidators"

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
}

export const SupplierForm: React.FC<SupplierFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const { t } = useTranslation()
  const [formData, setFormData] = useState<SupplierFormData>({
    name: initialData?.name || "",
    contactName: initialData?.contactName || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    address: initialData?.address || "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    const validation = await validateSupplierForm(formData, t)
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
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">{t('suppliers.name')}*</label>
        <input
          id="name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
          className={`mt-1 block w-full border rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 ${errors.name ? "border-red-500" : "border-gray-300"}`}
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="contactName" className="block text-sm font-medium text-gray-700">{t('suppliers.contactName')}</label>
        <input
          id="contactName"
          name="contactName"
          type="text"
          value={formData.contactName}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">{t('suppliers.email')}</label>
        <input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          className={`mt-1 block w-full border rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 ${errors.email ? "border-red-500" : "border-gray-300"}`}
        />
        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">{t('suppliers.phone')}</label>
        <input
          id="phone"
          name="phone"
          type="text"
          value={formData.phone}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700">{t('suppliers.address')}</label>
        <textarea
          id="address"
          name="address"
          value={formData.address}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? t('common.saving') : t('common.save')}
        </button>
      </div>
      {errors.submit && <p className="text-sm text-red-500 mt-2">{errors.submit}</p>}
    </form>
  )
}
