import { useState, useEffect, useCallback, useRef } from "react"
import { useSettingsStore, InstallationTypeItem } from "../../../store/settingsStore"
import { useAuthStore } from "../../../store/authStore"
import {
  fetchInstallationTypes,
  createInstallationType,
  updateInstallationType as apiUpdateInstallationType,
  deleteInstallationType as apiDeleteInstallationType,
} from "../services/installationTypeServices"

export type InstallationType = {
  _id: string
  nombre: string
  descripcion?: string
  activo: boolean
  fechaCreacion?: string
}

const useInstallationTypes = () => {
  const { installationTypes: storedTypes, setInstallationTypes, ownerId } = useSettingsStore()
  const { userId, isAuthenticated } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasTriedInactiveRef = useRef(false)
  const initialLoadDoneRef = useRef(false)

  // Aislamiento: si ownerId está seteado pero pertenece a otro usuario, no se muestran
  const validInstallationTypes = userId && ownerId && ownerId !== userId ? [] : storedTypes

  const loadInstallationTypes = useCallback(async (includeInactive = false) => {
    if (!isAuthenticated) {
      return
    }

    setLoading(true)
    setError(null)
    try {
      const currentTypes = useSettingsStore.getState().installationTypes
      if (!navigator.onLine && currentTypes.length > 0) {
        setLoading(false)
        return
      }

      const data = await fetchInstallationTypes(includeInactive)
      const mappedData: InstallationTypeItem[] = (Array.isArray(data) ? data : []).map((cat) => ({
        _id: cat._id,
        nombre: cat.nombre,
        descripcion: cat.descripcion,
        activo: cat.activo !== undefined ? cat.activo : true,
        fechaCreacion: cat.fechaCreacion,
      }))

      // Guard: solo actualiza si los datos realmente difieren
      if (JSON.stringify(currentTypes) !== JSON.stringify(mappedData)) {
        setInstallationTypes(mappedData)
      }

      initialLoadDoneRef.current = true
      if (includeInactive) {
        hasTriedInactiveRef.current = true
      }
    } catch (err: unknown) {
      const currentTypes = useSettingsStore.getState().installationTypes
      if (currentTypes.length > 0) {
        setLoading(false)
        return
      }
      console.error("Error al cargar tipos de instalación:", err)
      setError((err as Error).message)
      initialLoadDoneRef.current = true
      if (includeInactive) {
        hasTriedInactiveRef.current = true
      }
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, setInstallationTypes])

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
      const currentTypes = useSettingsStore.getState().installationTypes
      const createdItem: InstallationTypeItem = {
        _id: newType._id,
        nombre: newType.nombre,
        descripcion: newType.descripcion,
        activo: newType.activo !== undefined ? newType.activo : true,
        fechaCreacion: newType.fechaCreacion,
      }
      setInstallationTypes([...currentTypes, createdItem])
      return { message: "Tipo de instalación creado con éxito" }
    } catch (err: unknown) {
      throw err
    }
  }

  const updateInstallationType = async (id: string, data: Partial<InstallationType>): Promise<{ message: string }> => {
    try {
      const updatedType = await apiUpdateInstallationType(id, data)
      const currentTypes = useSettingsStore.getState().installationTypes
      const nextTypes = currentTypes.map((cat) =>
        cat._id === id ? { ...cat, ...updatedType } : cat
      )
      setInstallationTypes(nextTypes)
      return { message: "Tipo de instalación actualizado con éxito" }
    } catch (err: unknown) {
      throw err
    }
  }

  const removeInstallationType = async (id: string): Promise<{ message: string }> => {
    try {
      await apiDeleteInstallationType(id)
      const currentTypes = useSettingsStore.getState().installationTypes
      setInstallationTypes(currentTypes.filter((cat) => cat._id !== id))
      return { message: "Tipo de instalación eliminado con éxito" }
    } catch (err: unknown) {
      throw err
    }
  }

  useEffect(() => {
    if (isAuthenticated && !initialLoadDoneRef.current) {
      loadInstallationTypes()
    }
  }, [isAuthenticated, loadInstallationTypes])

  useEffect(() => {
    if (
      initialLoadDoneRef.current &&
      isAuthenticated &&
      !loading &&
      !hasTriedInactiveRef.current &&
      validInstallationTypes.length === 0 &&
      error === null
    ) {
      loadInstallationTypes(true)
    }
  }, [isAuthenticated, loading, validInstallationTypes.length, error, loadInstallationTypes])

  return {
    installationTypes: validInstallationTypes,
    loading,
    error,
    loadInstallationTypes,
    addInstallationType,
    updateInstallationType,
    removeInstallationType,
  }
}

export default useInstallationTypes
