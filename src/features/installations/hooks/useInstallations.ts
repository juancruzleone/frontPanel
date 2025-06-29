"use client"

import type React from "react"

import { useEffect, useState, useCallback } from "react"
import {
  fetchInstallations,
  createInstallation,
  updateInstallation,
  deleteInstallation,
  addDeviceToInstallation as apiAddDeviceToInstallation,
  fetchInstallationById,
  fetchInstallationDevices,
  deleteDeviceFromInstallation,
  fetchAssets as apiFetchAssets,
} from "../services/installationServices"
import { validateInstallationForm } from "../validators/installationsValidations"

export type Asset = {
  _id: string
  nombre: string
  marca?: string
  modelo?: string
  numeroSerie?: string
  estado: string
  fechaCreacion: string
}

export type Device = {
  _id?: string
  assetId: string
  nombre: string
  ubicacion: string
  categoria: string
  templateId?: string
  estado: string
  marca?: string
  modelo?: string
  numeroSerie?: string
}

export type Installation = {
  _id?: string
  company: string
  address: string
  floorSector?: string
  postalCode?: string
  city?: string
  province?: string
  installationType: string
  image?: File | null | string
  devices?: Device[]
}

const useInstallations = () => {
  const [installations, setInstallations] = useState<Installation[]>([])
  const [installationTypes, setInstallationTypes] = useState<string[]>([])
  const [currentInstallation, setCurrentInstallation] = useState<Installation | null>(null)
  const [installationDevices, setInstallationDevices] = useState<Device[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingAssets, setLoadingAssets] = useState(false)
  const [errorLoadingAssets, setErrorLoadingAssets] = useState<string | null>(null)

  const [formData, setFormData] = useState<Omit<Installation, "_id">>({
    company: "",
    address: "",
    installationType: "",
    floorSector: "",
    postalCode: "",
    city: "",
    province: "",
  })

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const extractInstallationTypes = useCallback((installations: Installation[]) => {
    const types = new Set<string>()
    installations.forEach((inst) => {
      if (inst.installationType) {
        types.add(inst.installationType)
      }
    })
    return Array.from(types)
  }, [])

  const loadAssets = useCallback(async () => {
    setLoadingAssets(true)
    setErrorLoadingAssets(null)
    try {
      const data = await apiFetchAssets()
      setAssets(data)
      if (data.length === 0) {
        setErrorLoadingAssets("No hay activos disponibles para asignar")
      }
    } catch (err: any) {
      console.error("Error al cargar activos:", err)
      setErrorLoadingAssets(err.message || "Error al cargar activos")
      setAssets([])
    } finally {
      setLoadingAssets(false)
    }
  }, [])

  const loadInstallations = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchInstallations()
      setInstallations(data)
      setInstallationTypes(extractInstallationTypes(data))
    } catch (err: any) {
      console.error("Error al cargar instalaciones:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [extractInstallationTypes])

  const loadInstallationDetails = async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const [installation, devices] = await Promise.all([fetchInstallationById(id), fetchInstallationDevices(id)])

      setCurrentInstallation(installation)
      setInstallationDevices(Array.isArray(devices) ? devices : [])
      return { installation, devices }
    } catch (err: any) {
      console.error("Error al cargar detalles de instalación:", err)
      setError(err.message)
      setCurrentInstallation(null)
      setInstallationDevices([])
      throw err
    } finally {
      setLoading(false)
    }
  }

  const removeDeviceFromInstallation = async (installationId: string, deviceId: string) => {
    try {
      await deleteDeviceFromInstallation(installationId, deviceId)
      setInstallationDevices((prev) => prev.filter((d) => d._id !== deviceId))
      return { message: "Dispositivo eliminado con éxito" }
    } catch (err: any) {
      console.error("Error al eliminar dispositivo:", err)
      throw err
    }
  }

  useEffect(() => {
    loadInstallations()
  }, [loadInstallations])

  const handleFieldChange = async (name: string, value: string) => {
    const updatedData = { ...formData, [name]: value }
    setFormData(updatedData)

    const validation = await validateInstallationForm(updatedData)
    setFormErrors(validation.errors)
  }

  const handleSubmitForm = async (
    e: React.FormEvent,
    isEditMode: boolean,
    initialData: Installation | null,
    onSuccess: (message: string) => void,
    onAdd: (data: Installation) => Promise<{ message: string }>,
    onEdit: (id: string, data: Installation) => Promise<{ message: string }>,
  ) => {
    e.preventDefault()
    setIsSubmitting(true)

    const validation = await validateInstallationForm(formData)

    if (!validation.isValid) {
      setFormErrors(validation.errors)
      setIsSubmitting(false)
      return
    }

    try {
      let message: string

      if (isEditMode && initialData?._id) {
        const result = await onEdit(initialData._id, formData)
        message = result.message
      } else {
        const result = await onAdd(formData)
        message = result.message
      }

      onSuccess(message)
      resetForm()
    } catch (err) {
      console.error("Error al guardar instalación:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const addInstallation = async (installation: Installation): Promise<{ message: string }> => {
    try {
      const newInstallation = await createInstallation(installation)
      setInstallations((prev) => [newInstallation, ...prev])

      if (!installationTypes.includes(newInstallation.installationType)) {
        setInstallationTypes((prev) => [...prev, newInstallation.installationType])
      }

      return { message: "Instalación creada con éxito" }
    } catch (err: any) {
      console.error("Error al crear instalación:", err)
      throw err
    }
  }

  const editInstallation = async (id: string, updatedData: Installation): Promise<{ message: string }> => {
    try {
      const updatedInstallation = await updateInstallation(id, updatedData)
      setInstallations((prev) => prev.map((inst) => (inst._id === id ? updatedInstallation : inst)))

      if (!installationTypes.includes(updatedInstallation.installationType)) {
        setInstallationTypes((prev) => [...prev, updatedInstallation.installationType])
      }

      return { message: "Instalación actualizada con éxito" }
    } catch (err: any) {
      console.error("Error al actualizar instalación:", err)
      throw err
    }
  }

  const removeInstallation = async (id: string): Promise<void> => {
    try {
      await deleteInstallation(id)
      setInstallations((prev) => prev.filter((inst) => inst._id !== id))
    } catch (err: any) {
      console.error("Error al eliminar instalación:", err)
      throw err
    }
  }

  const addDeviceToInstallation = async (installationId: string, device: Device): Promise<{ message: string }> => {
    try {
      const result = await apiAddDeviceToInstallation(installationId, device)
      setInstallationDevices((prev) => [...prev, device])

      setInstallations((prev) =>
        prev.map((inst) =>
          inst._id === installationId
            ? {
                ...inst,
                devices: [...(inst.devices || []), device],
              }
            : inst,
        ),
      )

      return { message: "Dispositivo agregado con éxito" }
    } catch (err: any) {
      console.error("Error al agregar dispositivo:", err)
      throw err
    }
  }

  const resetForm = () => {
    setFormData({
      company: "",
      address: "",
      installationType: "",
      floorSector: "",
      postalCode: "",
      city: "",
      province: "",
    })
    setFormErrors({})
  }

  const setFormValues = (data: Partial<Installation>) => {
    setFormData((prev) => ({ ...prev, ...data }))
  }

  return {
    installations,
    installationTypes,
    currentInstallation,
    installationDevices,
    assets,
    loading,
    loadingAssets,
    error,
    errorLoadingAssets,
    loadInstallations,
    loadInstallationDetails,
    loadAssets,
    addInstallation,
    editInstallation,
    removeInstallation,
    addDeviceToInstallation,
    removeDeviceFromInstallation,
    formData,
    setFormData,
    formErrors,
    handleFieldChange,
    handleSubmitForm,
    isSubmitting,
    setFormErrors,
    resetForm,
    setFormValues,
  }
}

export default useInstallations
