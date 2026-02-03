import { useEffect, useState, useCallback } from "react"
import {
  fetchAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  assignTemplateToAsset as apiAssignTemplateToAsset,
  fetchTemplates,
} from "../services/assetServices"
import { fetchFormCategories } from "../../forms/services/formServices"

export type Asset = {
  _id?: string
  nombre: string
  templateId: string
  marca?: string
  modelo?: string
  numeroSerie?: string
  fechaCreacion?: Date
  fechaActualizacion?: Date
}

export type Template = {
  _id: string
  nombre: string
  descripcion?: string
  categoria: string
  campos: any[]
  createdAt?: Date
  updatedAt?: Date
}

const useAssets = () => {
  const [assets, setAssets] = useState<Asset[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadCategories = useCallback(async () => {
    try {
      console.log('=== DEBUG ASSETS CATEGORIES ===')
      console.log('Cargando categorías de formularios...')
      const response = await fetchFormCategories()
      console.log('Respuesta de categorías:', response)
      const fetchedCategories = response.categories || response
      console.log('Categorías extraídas:', fetchedCategories)
      const categoryNames = fetchedCategories.map((cat: any) => cat.nombre)
      console.log('Nombres de categorías:', categoryNames)
      console.log('================================')
      setCategories(categoryNames)
    } catch (err: any) {
      console.error("Error al cargar categorías:", err)
      // Si falla la carga de categorías, extraer de las plantillas como fallback
      const uniqueCategories = new Set<string>()
      templates.forEach((template) => {
        if (template.categoria) {
          uniqueCategories.add(template.categoria)
        }
      })
      setCategories(Array.from(uniqueCategories))
    }
  }, [templates])

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    total: 0
  })

  const loadTemplates = useCallback(async (params: { page?: number, limit?: number, search?: string } = {}) => {
    setTemplatesLoading(true)
    try {
      const result = await fetchTemplates(params)
      if (result.success && result.pagination) {
        setTemplates(result.data)
      } else {
        setTemplates(result)
      }
    } catch (err: any) {
      console.error("Error al cargar plantillas:", err)
      setError(err.message)
    } finally {
      setTemplatesLoading(false)
    }
  }, [])

  const loadAssets = useCallback(async (params: { page?: number, limit?: number, search?: string } = {}) => {
    setLoading(true)
    try {
      const result = await fetchAssets(params)
      if (result.success && result.pagination) {
        setAssets(result.data)
        setPagination(result.pagination)
      } else {
        // Fallback para formato antiguo
        setAssets(result)
      }
    } catch (err: any) {
      console.error("Error al cargar activos:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTemplates({ page: 1, limit: 100 }) // Load all relevant templates for selection
    loadAssets({ page: 1, limit: 10 })
  }, [loadTemplates, loadAssets])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  const addAsset = async (asset: Asset): Promise<{ message: string }> => {
    try {
      const newAsset = await createAsset(asset)
      setAssets((prev) => [newAsset, ...prev])
      return { message: "Activo creado con éxito" }
    } catch (err: any) {
      console.error("Error al crear activo:", err)
      throw err
    }
  }

  const editAsset = async (id: string, updatedData: Asset): Promise<{ message: string }> => {
    try {
      const updatedAsset = await updateAsset(id, updatedData)
      setAssets((prev) => prev.map((asset) => (asset._id === id ? updatedAsset : asset)))
      return { message: "Activo actualizado con éxito" }
    } catch (err: any) {
      console.error("Error al actualizar activo:", err)
      throw err
    }
  }

  const removeAsset = async (id: string): Promise<void> => {
    try {
      await deleteAsset(id)
      setAssets((prev) => prev.filter((asset) => asset._id !== id))
    } catch (err: any) {
      console.error("Error al eliminar activo:", err)
      throw err
    }
  }

  const assignTemplateToAsset = async (assetId: string, templateId: string): Promise<{ message: string }> => {
    try {
      const result = await apiAssignTemplateToAsset(assetId, templateId)
      setAssets((prev) => prev.map((asset) => (asset._id === assetId ? { ...asset, templateId } : asset)))
      return { message: result.message || "Plantilla asignada con éxito" }
    } catch (err: any) {
      console.error("Error al asignar plantilla:", err)
      throw err
    }
  }

  const getTemplateById = (templateId: string): Template | undefined => {
    return templates.find((template) => template._id === templateId)
  }

  const getTemplatesByCategory = (categoria: string): Template[] => {
    return templates.filter((template) => template.categoria === categoria)
  }

  return {
    assets,
    templates,
    categories,
    loading,
    templatesLoading,
    error,
    loadAssets,
    loadTemplates,
    loadCategories,
    addAsset,
    editAsset,
    removeAsset,
    assignTemplateToAsset,
    getTemplateById,
    getTemplatesByCategory,
    pagination,
  }
}

export default useAssets
