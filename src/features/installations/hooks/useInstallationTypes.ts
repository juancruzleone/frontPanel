"use client"

import { useState, useEffect, useCallback } from "react"
import { fetchInstallationTypes, createInstallationType } from "../services/installationTypeServices"

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
      const data = await fetchInstallationTypes()
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

  useEffect(() => {
    loadInstallationTypes()
  }, [loadInstallationTypes])

  return {
    installationTypes,
    loading,
    error,
    loadInstallationTypes,
    addInstallationType,
  }
}

export default useInstallationTypes
