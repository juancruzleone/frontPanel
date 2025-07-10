import { useState, useCallback } from "react"
import {
  fetchFormCategories,
  fetchFormCategoryById,
  createFormCategory,
  updateFormCategory,
  deleteFormCategory,
} from "../services/formServices"

export type FormCategory = {
  _id?: string
  nombre: string
  descripcion?: string
  activa?: boolean
}

const useFormCategories = () => {
  const [categories, setCategories] = useState<FormCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<Omit<FormCategory, "_id">>({
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
      const response = await fetchFormCategories()
      const fetchedCategories = response.categories || response
      setCategories(fetchedCategories)
    } catch (err: any) {
      console.error("Error al cargar categorías:", err)
      setError(err.message || "Error al cargar categorías")
    } finally {
      setLoading(false)
    }
  }, [])

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
    onSuccess: (message: string) => void,
    onCreate: (data: FormCategory) => Promise<{ message: string }>,
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
      onSuccess(result.message)
      resetForm()
      await loadCategories()
    } catch (err) {
      console.error("Error al guardar categoría:", err)
      setError("Error al guardar categoría")
    } finally {
      setIsSubmitting(false)
    }
  }

  const addCategory = async (category: FormCategory): Promise<{ message: string }> => {
    try {
      const response = await createFormCategory(category)
      return { message: response.message || "Categoría creada con éxito" }
    } catch (err: any) {
      console.error("Error al crear categoría:", err)
      throw err
    }
  }

  const updateCategory = async (id: string, data: Partial<FormCategory>): Promise<{ message: string }> => {
    try {
      const response = await updateFormCategory(id, data)
      return { message: response.message || "Categoría actualizada con éxito" }
    } catch (err: any) {
      console.error("Error al actualizar categoría:", err)
      throw err
    }
  }

  const removeCategory = async (id: string): Promise<{ message: string }> => {
    try {
      const response = await deleteFormCategory(id)
      return { message: response.message || "Categoría eliminada con éxito" }
    } catch (err: any) {
      console.error("Error al eliminar categoría:", err)
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
    categories,
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