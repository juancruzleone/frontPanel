import { useState, useEffect, useCallback, useRef } from "react"
import {
  fetchInstallationTypes,
  createInstallationType,
  updateInstallationType as apiUpdateInstallationType,
  deleteInstallationType as apiDeleteInstallationType
} from "../services/installationTypeServices"
import { useAuthStore } from "../../../store/authStore"

export type InstallationType = {
  _id: string
  nombre: string
  descripcion?: string
  activo: boolean
  fechaCreacion: string
}

const useInstallationTypes = () => {
  const [installationTypes, setInstallationTypes] = useState<InstallationType[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasTriedInactiveRef = useRef(false)
  const initialLoadDoneRef = useRef(false)
  const { isAuthenticated, token } = useAuthStore()

  const loadInstallationTypes = useCallback(async (includeInactive = false) => {
    // No intentar cargar si no está autenticado
    if (!isAuthenticated || !token) {
      console.log('Usuario no autenticado, no se cargarán tipos de instalación')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await fetchInstallationTypes(includeInactive)
      setInstallationTypes(data)
      initialLoadDoneRef.current = true
      if (includeInactive) {
        hasTriedInactiveRef.current = true
      }
    } catch (err: any) {
      console.error('Error al cargar tipos de instalación:', err)
      setError(err.message)
      initialLoadDoneRef.current = true
      // Marcar como intentado para evitar loops infinitos
      if (includeInactive) {
        hasTriedInactiveRef.current = true
      }
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, token])

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
      setInstallationTypes((prev) => [...prev, newType])
      return { message: "Tipo de instalación creado con éxito" }
    } catch (err: any) {
      throw err
    }
  }

  const updateInstallationType = async (id: string, data: Partial<InstallationType>): Promise<{ message: string }> => {
    try {
      const updatedType = await apiUpdateInstallationType(id, data)
      setInstallationTypes(prev => prev.map(type =>
        type._id === id ? { ...type, ...updatedType } : type
      ))
      return { message: "Tipo de instalación actualizado con éxito" }
    } catch (err: any) {
      throw err
    }
  }

  const removeInstallationType = async (id: string): Promise<{ message: string }> => {
    try {
      await apiDeleteInstallationType(id)
      setInstallationTypes(prev => prev.filter(type => type._id !== id))
      return { message: "Tipo de instalación eliminado con éxito" }
    } catch (err: any) {
      throw err
    }
  }

  // Cargar tipos de instalación cuando el usuario se autentica
  useEffect(() => {
    if (isAuthenticated && token && !initialLoadDoneRef.current) {
      loadInstallationTypes()
    }
  }, [isAuthenticated, token, loadInstallationTypes])

  // Si no hay tipos de instalación activos y no hay error, intentar cargar todos incluyendo inactivos (solo una vez)
  useEffect(() => {
    if (
      initialLoadDoneRef.current && 
      isAuthenticated && 
      token && 
      !loading && 
      !hasTriedInactiveRef.current && 
      installationTypes.length === 0 && 
      error === null
    ) {
      console.log('No se encontraron tipos de instalación activos, intentando cargar todos...')
      loadInstallationTypes(true)
    }
  }, [isAuthenticated, token, loading, installationTypes.length, error, loadInstallationTypes])

  return {
    installationTypes,
    loading,
    error,
    loadInstallationTypes,
    addInstallationType,
    updateInstallationType,
    removeInstallationType,
  }
}

export default useInstallationTypes
