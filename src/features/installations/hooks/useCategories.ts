import type React from "react"
import { useState, useCallback } from "react"
import { useSettingsStore, SettingCategory } from "../../../store/settingsStore"
import { useAuthStore } from "../../../store/authStore"
import { createCategory, fetchCategories, updateCategory as apiUpdateCategory, deleteCategory as apiDeleteCategory } from "../services/categoryServices"
import { useTranslation } from "react-i18next"
import { validateCategoryForm, validateCategoryField } from "../validators/categoryValidations"

export type Category = {
  _id?: string
  nombre: string
  descripcion?: string
  activa?: boolean
}

const useCategories = () => {
  const { t } = useTranslation();
  const { categories: storedCategories, setCategories, ownerId } = useSettingsStore()
  const { userId } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validCategories = ownerId === userId ? storedCategories : []
  const installationCategories = validCategories.filter(cat => cat.tipo === 'instalacion')

  const [formData, setFormData] = useState<Omit<Category, "_id">>({
    nombre: "",
    descripcion: "",
    activa: true,
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadCategories = useCallback(async (includeInactive = false) => {
    setLoading(true)
    setError(null)
    try {
      if (!navigator.onLine && installationCategories.length > 0) {
        setLoading(false)
        return
      }

      const data = await fetchCategories(includeInactive)
      // Merge with other types of categories already in store
      const otherCategories = storedCategories.filter(cat => cat.tipo !== 'instalacion')
      const mappedData = data.map(cat => ({ ...cat, tipo: 'instalacion' })) as SettingCategory[]
      setCategories([...otherCategories, ...mappedData])
    } catch (err: unknown) {
      if (installationCategories.length > 0) {
        setLoading(false)
        return
      }
      setError((err as Error).message || "Error al cargar categorías")
    } finally {
      setLoading(false)
    }
  }, [installationCategories.length, setCategories, storedCategories])


  const handleFieldChange = async (name: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Validar por campo
    const result = validateCategoryField(name, value, { ...formData, [name]: value } as Category, t)
    setFormErrors((prev) => ({ ...prev, [name]: result.isValid ? "" : result.error || "" }))
  }

  const handleSubmitForm = async (
    e: React.FormEvent,
    onSuccess: (message: string) => void,
    onCreate: (data: Category) => Promise<{ message: string }>,
  ) => {
    e.preventDefault()
    setIsSubmitting(true)

    const validation = validateCategoryForm(formData, t)
    if (!validation.isValid) {
      setFormErrors(validation.errors)
      setIsSubmitting(false)
      return
    }

    try {
      const result = await onCreate(formData as Category)
      onSuccess(result.message)
      resetForm()
      await loadCategories()
    } catch (err) {
      setError("Error al guardar categoría")
    } finally {
      setIsSubmitting(false)
    }
  }

  const addCategory = async (category: Category): Promise<{ message: string }> => {
    try {
      await createCategory(category)
      return { message: "Categoría creada con éxito" }
    } catch (err: unknown) {
      throw err
    }
  }

  const updateCategory = async (id: string, data: Partial<Category>): Promise<{ message: string }> => {
    try {
      await apiUpdateCategory(id, data)
      setCategories(storedCategories.map(cat =>
        cat._id === id ? { ...cat, ...data } : cat
      ))
      return { message: "Categoría actualizada con éxito" }
    } catch (err: unknown) {
      throw err
    }
  }

  const removeCategory = async (id: string): Promise<{ message: string }> => {
    try {
      await apiDeleteCategory(id)
      setCategories(storedCategories.filter(cat => cat._id !== id))
      return { message: "Categoría eliminada con éxito" }
    } catch (err: unknown) {
      throw err
    }
  }

  const resetForm = () => {
    setFormData({
      nombre: "",
      descripcion: "",
      activa: true,
    })
    setFormErrors({})
  }

  return {
    categories: installationCategories as unknown as Category[],
    loading,
    error,
    formData,
    formErrors,
    loadCategories,
    handleFieldChange,
    handleSubmitForm,
    isSubmitting,
    addCategory,
    updateCategory,
    removeCategory,
    resetForm,
    setFormErrors,
  }
}

export default useCategories
