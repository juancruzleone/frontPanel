import { useState, useCallback, useEffect } from "react"
import { useSettingsStore, FormCategoryItem } from "../../../store/settingsStore"
import { useAuthStore } from "../../../store/authStore"
import {
  fetchFormCategories,
  createFormCategory,
  updateFormCategory,
  deleteFormCategory,
} from "../services/formServices"

export type FormCategory = {
  _id?: string
  nombre: string
  descripcion?: string
  activa?: boolean
  fechaCreacion?: string
}

const useFormCategories = () => {
  const { formCategories: storedCategories, setFormCategories, ownerId } = useSettingsStore()
  const { userId, isAuthenticated } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validCategories = userId && ownerId && ownerId !== userId ? [] : storedCategories

  const [formData, setFormData] = useState<Omit<FormCategory, "_id">>({
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
      const currentCategories = useSettingsStore.getState().formCategories
      if (!navigator.onLine && currentCategories.length > 0) {
        setLoading(false)
        return
      }
      const response = await fetchFormCategories(includeInactive)
      const fetchedCategories = response?.categories || response
      const list = Array.isArray(fetchedCategories) ? fetchedCategories : []

      const mappedData: FormCategoryItem[] = list.map((cat: Record<string, unknown>) => ({
        _id: String(cat._id || cat.id || ""),
        nombre: String(cat.nombre || ""),
        descripcion: cat.descripcion ? String(cat.descripcion) : undefined,
        activa: cat.activa !== undefined ? Boolean(cat.activa) : true,
        fechaCreacion: cat.fechaCreacion ? String(cat.fechaCreacion) : undefined,
      }))

      if (JSON.stringify(currentCategories) !== JSON.stringify(mappedData)) {
        setFormCategories(mappedData)
      }
    } catch (err: unknown) {
      const currentCategories = useSettingsStore.getState().formCategories
      if (currentCategories.length > 0) {
        setLoading(false)
        return
      }
      setError((err as Error).message || "Error al cargar categorías")
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, setFormCategories])

  const handleFieldChange = (name: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const validateForm = (data: FormCategory) => {
    const errors: Record<string, string> = {}

    if (!data.nombre || data.nombre.trim().length < 2) {
      errors.nombre = "El nombre debe tener al menos 2 caracteres"
    }

    if (data.descripcion && data.descripcion.length > 255) {
      errors.descripcion = "La descripción no puede exceder 255 caracteres"
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    }
  }

  const handleSubmitForm = async (
    e: React.FormEvent,
    onSuccessCallback: (message: string) => void,
    onCreate: (data: FormCategory) => Promise<{ message: string }>
  ) => {
    e.preventDefault()
    setIsSubmitting(true)

    const validation = validateForm(formData)
    if (!validation.isValid) {
      setFormErrors(validation.errors)
      setIsSubmitting(false)
      return
    }

    try {
      const result = await onCreate(formData)
      if (typeof onSuccessCallback === "function") {
        onSuccessCallback(result.message)
      }
      resetForm()
      await loadCategories(true)
    } catch {
      setError("Error al guardar categoría")
    } finally {
      setIsSubmitting(false)
    }
  }

  const addCategory = async (category: FormCategory): Promise<{ message: string }> => {
    try {
      const payload = {
        ...category,
        activa: category.activa !== undefined ? category.activa : true,
      }
      const response = await createFormCategory(payload)
      const current = useSettingsStore.getState().formCategories
      const createdItem: FormCategoryItem = {
        _id: String(response._id || response.id || ""),
        nombre: String(response.nombre || category.nombre),
        descripcion: response.descripcion ? String(response.descripcion) : category.descripcion,
        activa: response.activa !== undefined ? Boolean(response.activa) : true,
        fechaCreacion: response.fechaCreacion ? String(response.fechaCreacion) : new Date().toISOString(),
      }
      if (createdItem._id) {
        setFormCategories([...current, createdItem])
      }
      return { message: response.message || "Categoría creada con éxito" }
    } catch (err: unknown) {
      throw err
    }
  }

  const updateCategory = async (id: string, data: Partial<FormCategory>): Promise<{ message: string }> => {
    try {
      const payload = {
        ...data,
        activa: data.activa !== undefined ? data.activa : true,
      }
      const response = await updateFormCategory(id, payload)
      const current = useSettingsStore.getState().formCategories
      setFormCategories(
        current.map((cat) => (cat._id === id ? { ...cat, ...payload } : cat))
      )
      return { message: response.message || "Categoría actualizada con éxito" }
    } catch (err: unknown) {
      throw err
    }
  }

  const removeCategory = async (id: string): Promise<{ message: string }> => {
    try {
      const response = await deleteFormCategory(id)
      const current = useSettingsStore.getState().formCategories
      setFormCategories(current.filter((cat) => cat._id !== id))
      return { message: response.message || "Categoría eliminada con éxito" }
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
    isSubmitting,
    loadCategories,
    handleFieldChange,
    handleSubmitForm,
    addCategory,
    updateCategory,
    removeCategory,
    resetForm,
    setFormErrors,
  }
}

export default useFormCategories
