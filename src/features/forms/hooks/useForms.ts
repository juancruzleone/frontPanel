import { useEffect, useState, useCallback } from "react"
import {
  fetchFormTemplates,
  fetchFormTemplateById,
  fetchFormTemplatesByCategory,
  createFormTemplate,
  updateFormTemplate,
  deleteFormTemplate,
  fetchFormCategories,
} from "../services/formServices"

export type FormField = {
  name: string
  type: string
  label: string
  required?: boolean
  options?: string[]
  placeholder?: string
  defaultValue?: any
  min?: number
  max?: number
  step?: number
  helpText?: string
}

export type FormTemplate = {
  _id?: string
  nombre: string
  descripcion?: string
  categoria: string
  campos: FormField[]
  createdAt?: Date
  updatedAt?: Date
}

const useForms = () => {
  const [templates, setTemplates] = useState<FormTemplate[]>([])
  const [currentTemplate, setCurrentTemplate] = useState<FormTemplate | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<string[]>([])

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchFormTemplates()
      setTemplates(data)
    } catch (err: any) {
      setError(err.message)
      console.error("Error loading templates:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadCategories = useCallback(async () => {
    try {
      const response = await fetchFormCategories()
      const fetchedCategories = response.categories || response
      const categoryNames = fetchedCategories.map((cat: any) => cat.nombre)
      setCategories(categoryNames)
    } catch (err: any) {
      console.error("Error loading categories:", err)
      // Si falla la carga de categorías, extraer de las plantillas como fallback
      const uniqueCategories = Array.from(new Set(templates.map((t) => t.categoria)))
      setCategories(uniqueCategories)
    }
  }, [templates])

  const loadTemplateById = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchFormTemplateById(id)
      setCurrentTemplate(data)
      return data
    } catch (err: any) {
      setError(err.message)
      console.error("Error loading template by ID:", err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const loadTemplatesByCategory = useCallback(async (category: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchFormTemplatesByCategory(category)
      return data
    } catch (err: any) {
      setError(err.message)
      console.error("Error loading templates by category:", err)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const addTemplate = async (template: FormTemplate): Promise<FormTemplate> => {
    try {
      setError(null)
      const newTemplate = await createFormTemplate(template)

      // Actualizar el estado local inmediatamente
      setTemplates((prev) => [...prev, newTemplate])

      // Actualizar categorías si es necesaria
      if (!categories.includes(newTemplate.categoria)) {
        setCategories((prev) => [...prev, newTemplate.categoria])
      }

      return newTemplate
    } catch (err: any) {
      setError(err.message)
      console.error("Error adding template:", err)
      throw err
    }
  }

  const editTemplate = async (id: string, updatedData: FormTemplate): Promise<FormTemplate> => {
    try {
      setError(null)
      const updatedTemplate = await updateFormTemplate(id, updatedData)

      // Actualizar el estado local inmediatamente
      setTemplates((prev) => prev.map((t) => (t._id === id ? updatedTemplate : t)))

      // Actualizar categorías si cambió la categoría
      const allCategories = templates.map((t) => (t._id === id ? updatedTemplate.categoria : t.categoria))
      const uniqueCategories = Array.from(new Set(allCategories))
      setCategories(uniqueCategories)

      return updatedTemplate
    } catch (err: any) {
      setError(err.message)
      console.error("Error editing template:", err)
      throw err
    }
  }

  const removeTemplate = async (id: string): Promise<void> => {
    try {
      setError(null)
      await deleteFormTemplate(id)

      // Actualizar el estado local inmediatamente
      setTemplates((prev) => {
        const filtered = prev.filter((t) => t._id !== id)

        // Actualizar categorías después de eliminar
        const uniqueCategories = Array.from(new Set(filtered.map((t) => t.categoria)))
        setCategories(uniqueCategories)

        return filtered
      })
    } catch (err: any) {
      setError(err.message)
      console.error("Error removing template:", err)
      throw err
    }
  }

  const resetCurrentTemplate = () => {
    setCurrentTemplate(null)
  }

  const clearError = () => {
    setError(null)
  }

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  return {
    templates,
    currentTemplate,
    categories,
    loading,
    error,
    loadTemplates,
    loadCategories,
    loadTemplateById,
    loadTemplatesByCategory,
    addTemplate,
    editTemplate,
    removeTemplate,
    resetCurrentTemplate,
    setCurrentTemplate,
    clearError,
  }
}

export default useForms
