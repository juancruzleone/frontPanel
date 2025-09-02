import { useState, useEffect, useCallback } from "react"
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
  const [installationTypes, setInstallationTypes] = useState<InstallationType[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadInstallationTypes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      console.log('=== DEBUG INSTALLATION TYPES ===')
      console.log('Cargando tipos de instalación...')
      const data = await fetchInstallationTypes()
      console.log('Tipos de instalación cargados:', data)
      console.log('===============================')
      setInstallationTypes(data)
    } catch (err: any) {
      console.error("Error al cargar tipos de instalación:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

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
      console.error("Error al crear tipo de instalación:", err)
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
      console.error("Error al actualizar tipo de instalación:", err)
      throw err
    }
  }

  const removeInstallationType = async (id: string): Promise<{ message: string }> => {
    try {
      await apiDeleteInstallationType(id)
      setInstallationTypes(prev => prev.filter(type => type._id !== id))
      return { message: "Tipo de instalación eliminado con éxito" }
    } catch (err: any) {
      console.error("Error al eliminar tipo de instalación:", err)
      throw err
    }
  }

  useEffect(() => {
    loadInstallationTypes()
  }, [loadInstallationTypes])

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
