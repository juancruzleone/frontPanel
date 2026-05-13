import { useEffect, useState, useCallback } from "react"
import { useAssetStore } from "../../../store/assetStore"
import {
  fetchAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  assignTemplateToAsset as apiAssignTemplateToAsset,
  fetchTemplates,
  updateAssetStock as apiUpdateAssetStock,
} from "../services/assetServices"
import { fetchFormCategories } from "../../forms/services/formServices"

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
  const { assets, templates, categories, setAssets, setTemplates, setCategories, updateAsset: updateAssetInStore } = useAssetStore()
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
      // Si falla (ej. offline), mantenemos las categorías del store
    }
  }, [setCategories])

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    total: 0
  })

  const loadTemplates = useCallback(async (params: { page?: number, limit?: number, search?: string } = {}) => {
    if (!navigator.onLine && templates.length > 0) return

    setTemplatesLoading(true)
    try {
      const result = await fetchTemplates(params)
      const templatesList = Array.isArray(result) ? result : []
      setTemplates(templatesList)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setTemplatesLoading(false)
    }
  }, [templates.length, setTemplates])

  const loadAssets = useCallback(async (params: { page?: number, limit?: number, search?: string, category?: string } = {}) => {
    setLoading(true)
    try {
      if (!navigator.onLine) {
        // En modo offline, filtramos localmente lo que tenemos en el store
        // Esto es una solución mínima. Idealmente tendríamos una búsqueda más robusta
        // pero para "encontrar activos" cumple el objetivo.
        let filtered = [...assets]
        if (params.search) {
          const s = params.search.toLowerCase()
          filtered = filtered.filter(a => 
            a.nombre.toLowerCase().includes(s) || 
            a.numeroSerie?.toLowerCase().includes(s) ||
            a.marca?.toLowerCase().includes(s)
          )
        }
        if (params.category) {
          // Necesitaríamos saber la categoría del activo (vía template)
        }
        
        // No actualizamos el store en offline, solo la vista local si quisiéramos
        // Pero useAssets expone 'assets' del store. 
        // Para simplificar, en offline mostramos lo que hay.
        setLoading(false)
        return
      }

      const result = await fetchAssets(params)
      
      if (result.assets && Array.isArray(result.assets)) {
        setAssets(result.assets)
        setPagination({
          page: params.page || 1,
          limit: params.limit || 10,
          totalPages: result.totalPages || 1,
          total: result.total || 0
        })
      } else if (result.success && result.data) {
        setAssets(Array.isArray(result.data) ? result.data : [])
        setPagination(result.pagination || pagination)
      } else if (Array.isArray(result)) {
        setAssets(result)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [assets, pagination, setAssets])

  useEffect(() => {
    loadTemplates({ page: 1, limit: 100 }) // Load all relevant templates for selection
    loadAssets({ page: 1, limit: 10 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Solo ejecutar una vez al montar el componente

  useEffect(() => {
    loadCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Solo ejecutar una vez al montar el componente

  const addAsset = async (asset: Asset): Promise<{ message: string }> => {
    try {
      const newAsset = await createAsset(asset)
      setAssets([newAsset, ...assets])
      return { message: "Activo creado con éxito" }
    } catch (err: any) {
      throw err
    }
  }

  const editAsset = async (id: string, updatedData: Asset): Promise<{ message: string }> => {
    try {
      const updatedAsset = await updateAsset(id, updatedData)
      
      const originalAsset = assets.find(a => a._id === id)
      const newStock = Number(updatedData.stock)
      const oldStock = Number(originalAsset?.stock || 0)

      if (!isNaN(newStock) && newStock !== oldStock) {
        await apiUpdateAssetStock(id, newStock)
        updatedAsset.stock = newStock
      }

      updateAssetInStore(id, updatedAsset)
      return { message: "Activo actualizado con éxito" }
    } catch (err: any) {
      throw err
    }
  }

  const removeAsset = async (id: string): Promise<void> => {
    try {
      await deleteAsset(id)
      setAssets(assets.filter((asset) => asset._id !== id))
    } catch (err: any) {
      throw err
    }
  }

  const assignTemplateToAsset = async (assetId: string, templateId: string): Promise<{ message: string }> => {
    try {
      const result = await apiAssignTemplateToAsset(assetId, templateId)
      updateAssetInStore(assetId, { templateId })
      return { message: result.message || "Plantilla asignada con éxito" }
    } catch (err: any) {
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
      await apiUpdateAssetStock(assetId, stock)
      updateAssetInStore(assetId, { stock })
    } catch (err: any) {
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
