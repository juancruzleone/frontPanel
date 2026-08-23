import { useState, useEffect, useCallback, useRef } from "react"
import { useSettingsStore, SettingCategory } from "../../../store/settingsStore"
import { useAuthStore } from "../../../store/authStore"
import {
  fetchInstallationTypes,
  createInstallationType,
  updateInstallationType as apiUpdateInstallationType,
  deleteInstallationType as apiDeleteInstallationType
} from "../services/installationTypeServices"

export type InstallationType = {
  _id: string
  nombre: string
  descripcion?: string
  activo: boolean
  fechaCreacion: string
}

const useInstallationTypes = () => {
  const { categories: storedCategories, setCategories, ownerId } = useSettingsStore()
  const { userId, isAuthenticated } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasTriedInactiveRef = useRef(false)
  const initialLoadDoneRef = useRef(false)

  const validCategories = userId && ownerId === userId ? storedCategories : []
  const installationTypes = validCategories.filter(cat => cat.tipo === 'instalacion_tipo')

  const loadInstallationTypes = useCallback(async (includeInactive = false) => {
    if (!isAuthenticated) {
      return
    }

    setLoading(true)
    setError(null)
    try {
      const { categories: currentCategories, setCategories: currentSetCategories } = useSettingsStore.getState()
      const currentInstallationTypes = currentCategories.filter(cat => cat.tipo === 'instalacion_tipo')
      if (!navigator.onLine && currentInstallationTypes.length > 0) {
        setLoading(false)
        return
      }

      const data = await fetchInstallationTypes(includeInactive)
      // Merge with other types of categories already in store
      const otherCategories = currentCategories.filter(cat => cat.tipo !== 'instalacion_tipo')
      const mappedData = data.map(cat => ({ ...cat, tipo: 'instalacion_tipo' })) as SettingCategory[]
      const nextCategories = [...otherCategories, ...mappedData]
      // SOLO actualizar si realmente cambió (evita nueva referencia -> loop)
      if (JSON.stringify(currentCategories) !== JSON.stringify(nextCategories)) {
        currentSetCategories(nextCategories)
      }

      initialLoadDoneRef.current = true
      if (includeInactive) {
        hasTriedInactiveRef.current = true
      }
    } catch (err: unknown) {
      const { categories: currentCategories } = useSettingsStore.getState()
      const currentInstallationTypes = currentCategories.filter(cat => cat.tipo === 'instalacion_tipo')
      if (currentInstallationTypes.length > 0) {
        setLoading(false)
        return
      }
      console.error('Error al cargar tipos de instalación:', err)
      setError((err as Error).message)
      initialLoadDoneRef.current = true
      if (includeInactive) {
        hasTriedInactiveRef.current = true
      }
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, setCategories])


  const addInstallationType = async (typeData: {
    nombre: string
    descripcion?: string
    activo?: boolean
  }) => {
    try {
      const newType = await createInstallationType({
        ...typeData,
        activo: typeData.activo !== undefined ? typeData.activo : true,
      })
      const otherCategories = storedCategories.filter(cat => cat.tipo !== 'instalacion_tipo')
      const updatedInstallationTypes = [...installationTypes, { ...newType, tipo: 'instalacion_tipo' }]
      setCategories([...otherCategories, ...updatedInstallationTypes] as SettingCategory[])
      return { message: "Tipo de instalación creado con éxito" }
    } catch (err: unknown) {
      throw err
    }
  }

  const updateInstallationType = async (id: string, data: Partial<InstallationType>): Promise<{ message: string }> => {
    try {
      const updatedType = await apiUpdateInstallationType(id, data)
      setCategories(storedCategories.map(cat =>
        cat._id === id ? { ...cat, ...updatedType } : cat
      ) as SettingCategory[])
      return { message: "Tipo de instalación actualizado con éxito" }
    } catch (err: unknown) {
      throw err
    }
  }

  const removeInstallationType = async (id: string): Promise<{ message: string }> => {
    try {
      await apiDeleteInstallationType(id)
      setCategories(storedCategories.filter(cat => cat._id !== id))
      return { message: "Tipo de instalación eliminado con éxito" }
    } catch (err: unknown) {
      throw err
    }
  }

  // Cargar tipos de instalación cuando el usuario se autentica
  useEffect(() => {
    if (isAuthenticated && !initialLoadDoneRef.current) {
      loadInstallationTypes()
    }
  }, [isAuthenticated, loadInstallationTypes])

  // Si no hay tipos de instalación activos y no hay error, intentar cargar todos incluyendo inactivos (solo una vez)
  useEffect(() => {
    if (
      initialLoadDoneRef.current && 
      isAuthenticated && 
      !loading && 
      !hasTriedInactiveRef.current && 
      installationTypes.length === 0 && 
      error === null
    ) {
      loadInstallationTypes(true)
    }
  }, [isAuthenticated, loading, installationTypes.length, error, loadInstallationTypes])

  return {
    installationTypes: installationTypes as unknown as InstallationType[],
    loading,
    error,
    loadInstallationTypes,
    addInstallationType,
    updateInstallationType,
    removeInstallationType,
  }
}

export default useInstallationTypes
