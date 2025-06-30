import { useEffect, useState, useCallback } from "react"
import {
  fetchAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  assignTemplateToAsset as apiAssignTemplateToAsset,
  fetchTemplates,
} from "../services/assetServices"

export type Asset = {
  _id?: string
  nombre: string
  marca: string
  modelo: string
  numeroSerie: string
  templateId: string
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

  const extractCategories = useCallback((templates: Template[]) => {
    const uniqueCategories = new Set<string>()
    templates.forEach((template) => {
      if (template.categoria) {
        uniqueCategories.add(template.categoria)
      }
    })
    return Array.from(uniqueCategories)
  }, [])

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true)
    try {
      const data = await fetchTemplates()
      setTemplates(data)
      setCategories(extractCategories(data))
    } catch (err: any) {
      console.error("Error al cargar plantillas:", err)
      setError(err.message)
    } finally {
      setTemplatesLoading(false)
    }
  }, [extractCategories])

  const loadAssets = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAssets()
      setAssets(data)
    } catch (err: any) {
      console.error("Error al cargar activos:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTemplates()
    loadAssets()
  }, [loadTemplates, loadAssets])

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
    addAsset,
    editAsset,
    removeAsset,
    assignTemplateToAsset,
    getTemplateById,
    getTemplatesByCategory,
  }
}

export default useAssets
