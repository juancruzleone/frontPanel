import type React from "react"
import { useState, useCallback, useEffect } from "react"
import { useSettingsStore, CategoryItem } from "../../../store/settingsStore"
import { useAuthStore } from "../../../store/authStore"
import {
  createCategory,
  fetchCategories,
  updateCategory as apiUpdateCategory,
  deleteCategory as apiDeleteCategory,
} from "../services/categoryServices"
import { useTranslation } from "react-i18next"
import { validateCategoryForm, validateCategoryField } from "../validators/categoryValidations"

export type Category = {
  _id?: string
  nombre: string
  descripcion?: string
  activa?: boolean
  fechaCreacion?: string
}

const useCategories = () => {
  const { t } = useTranslation()
  const { assetCategories: storedCategories, setAssetCategories, ownerId } = useSettingsStore()
  const { userId, isAuthenticated } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validCategories = userId && ownerId && ownerId !== userId ? [] : storedCategories

  const [formData, setFormData] = useState<Omit<Category, "_id">>({
    nombre: "",
    descripcion: "",
    activa: true,
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadCategories = useCallback(async (includeInactive = true) => {
    if (!isAuthenticated) {
      return
    }

    setLoading(true)
    setError(null)
    try {
      const currentCategories = useSettingsStore.getState().assetCategories
      if (!navigator.onLine && currentCategories.length > 0) {
        setLoading(false)
        return
      }

      const data = await fetchCategories(includeInactive)
      const mappedData: CategoryItem[] = (Array.isArray(data) ? data : []).map((cat) => ({
        _id: cat._id,
        nombre: cat.nombre,
        descripcion: cat.descripcion,
        activa: cat.activa !== undefined ? cat.activa : true,
        fechaCreacion: cat.fechaCreacion,
      }))

      if (JSON.stringify(currentCategories) !== JSON.stringify(mappedData)) {
        setAssetCategories(mappedData)
      }
    } catch (err: unknown) {
      const currentCategories = useSettingsStore.getState().assetCategories
      if (currentCategories.length > 0) {
        setLoading(false)
        return
      }
      setError((err as Error).message || "Error al cargar categorías")
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, setAssetCategories])

  const handleFieldChange = async (name: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    const result = validateCategoryField(name, value, { ...formData, [name]: value } as Category, t)
    setFormErrors((prev) => ({ ...prev, [name]: result.isValid ? "" : result.error || "" }))
  }

  const handleSubmitForm = async (
    e: React.FormEvent,
    onSuccess: (message: string) => void,
    onCreate: (data: Category) => Promise<{ message: string }>
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
      await loadCategories(true)
    } catch {
      setError("Error al guardar categoría")
    } finally {
      setIsSubmitting(false)
    }
  }

  const addCategory = async (category: Category): Promise<{ message: string }> => {
    try {
      const payload = {
        ...category,
        activa: category.activa !== undefined ? category.activa : true,
      }
      const response = await createCategory(payload)
      const current = useSettingsStore.getState().assetCategories
      const createdItem: CategoryItem = {
        _id: response._id || response.id,
        nombre: response.nombre || category.nombre,
        descripcion: response.descripcion || category.descripcion,
        activa: response.activa !== undefined ? response.activa : true,
        fechaCreacion: response.fechaCreacion || new Date().toISOString(),
      }
      if (createdItem._id) {
        setAssetCategories([...current, createdItem])
      }
      return { message: "Categoría creada con éxito" }
    } catch (err: unknown) {
      throw err
    }
  }

  const updateCategory = async (id: string, data: Partial<Category>): Promise<{ message: string }> => {
    try {
      const payload = {
        ...data,
        activa: data.activa !== undefined ? data.activa : true,
      }
      const updated = await apiUpdateCategory(id, payload)
      const current = useSettingsStore.getState().assetCategories
      setAssetCategories(
        current.map((cat) => (cat._id === id ? { ...cat, ...updated, ...payload } : cat))
      )
      return { message: "Categoría actualizada con éxito" }
    } catch (err: unknown) {
      throw err
    }
  }

  const removeCategory = async (id: string): Promise<{ message: string }> => {
    try {
      await apiDeleteCategory(id)
      const current = useSettingsStore.getState().assetCategories
      setAssetCategories(current.filter((cat) => cat._id !== id))
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

  useEffect(() => {
    if (isAuthenticated) {
      loadCategories(true)
    }
  }, [isAuthenticated, loadCategories])

  return {
    categories: validCategories,
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
