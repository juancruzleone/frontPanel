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
import { getHeadersWithContentType } from "../../../shared/utils/apiHeaders"

export type Asset = {
  _id?: string
  nombre: string
  templateId: string
  marca?: string
  modelo?: string
  numeroSerie?: string
  stock?: number
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
      const response = await fetchFormCategories()
      const fetchedCategories = response.categories || response
      const categoryNames = fetchedCategories.map((cat: any) => cat.nombre)
      setCategories(categoryNames)
    } catch (err: any) {
      console.error("Error al cargar categorías:", err)
      setCategories([])
    }
  }, [])

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
        setTemplates(Array.isArray(result.data) ? result.data : [])
      } else {
        setTemplates(Array.isArray(result) ? result : [])
      }
    } catch (err: any) {
      console.error("Error al cargar plantillas:", err)
      setError(err.message)
      setTemplates([]) // Ensure templates is always an array even on error
    } finally {
      setTemplatesLoading(false)
    }
  }, [])

  const loadAssets = useCallback(async (params: { page?: number, limit?: number, search?: string, category?: string } = {}) => {
    setLoading(true)
    try {
      const result = await fetchAssets(params)
      
      // La API devuelve: {assets: Array, total: number, totalPages: number}
      if (result.assets && Array.isArray(result.assets)) {
        setAssets(result.assets)
        setPagination({
          page: params.page || 1,
          limit: params.limit || 10,
          totalPages: result.totalPages || 1,
          total: result.total || 0
        })
      } else if (result.success && result.data) {
        // Formato alternativo con success
        setAssets(Array.isArray(result.data) ? result.data : [])
        setPagination(result.pagination || pagination)
      } else if (Array.isArray(result)) {
        // Fallback para array directo
        setAssets(result)
      } else {
        setAssets([])
      }
    } catch (err: any) {
      console.error("Error al cargar activos:", err)
      setError(err.message)
      setAssets([])
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

  const updateAssetStock = async (assetId: string, stock: number): Promise<void> => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}activos/${assetId}/stock`, {
        method: "PUT",
        headers: getHeadersWithContentType(),
        body: JSON.stringify({ stock }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al actualizar el stock")
      }

      // Actualizar el estado local
      setAssets((prev) => prev.map((asset) => (asset._id === assetId ? { ...asset, stock } : asset)))
    } catch (err: any) {
      console.error("Error al actualizar stock:", err)
      throw err
    }
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
    updateAssetStock,
    pagination,
  }
}

export default useAssets
