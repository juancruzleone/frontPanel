import type React from "react"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useAuthStore } from "../../../store/authStore"
import { useInstallationStore } from "../../../store/installationStore"
import { useOfflineStore } from "../../../store/offlineStore"
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
import { useTranslation } from "react-i18next"

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
  cantidad?: number
  codigoQR?: string
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
  // Campos para abonos/estado/frecuencia
  frecuencia?: string
  fechaInicio?: string | Date
  fechaFin?: string | Date
  estado?: 'active' | 'inactive' | 'pending'
  fechaCreacion?: string | Date
  fechaActualizacion?: string | Date
  mesesFrecuencia?: string[]
}

const useInstallations = () => {
  const { t } = useTranslation();
  const { isAuthenticated, userId } = useAuthStore()
  const { 
    installations: storedInstallations, 
    assets: storedAssets, 
    lastUpdated,
    ownerId,
    setInstallations, 
    setAssets,
    addInstallation: storeAddInstallation,
    updateInstallation: storeUpdateInstallation,
    removeInstallation: storeRemoveInstallation
  } = useInstallationStore()

  const validStoredInstallations = ownerId === userId ? storedInstallations : []
  const assets = ownerId === userId ? storedAssets : []

  const [filteredOfflineInstallations, setFilteredOfflineInstallations] = useState<Installation[] | null>(null)

  const [currentInstallation, setCurrentInstallation] = useState<Installation | null>(null)
  const [installationDevices, setInstallationDevices] = useState<Device[]>([])
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

  const installationTypes = useMemo(() => {
    const types = new Set<string>()
    validStoredInstallations.forEach((inst) => {
      if (inst.installationType) {
        types.add(inst.installationType)
      }
    })
    return Array.from(types)
  }, [validStoredInstallations])

  const loadAssets = useCallback(async () => {
    setLoadingAssets(true)
    setErrorLoadingAssets(null)
    try {
      const data = await apiFetchAssets()
      setAssets(data)
      if (data.length === 0) {
        setErrorLoadingAssets("No hay activos disponibles para asignar")
      }
    } catch (err: unknown) {
      if (assets.length > 0) {
        // Silently use cache if offline or server unreachable
        return;
      }
      setErrorLoadingAssets((err as Error).message || "Error al cargar activos")
    } finally {
      setLoadingAssets(false)
    }
  }, [assets.length, setAssets])

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    total: 0
  })

  const loadInstallations = useCallback(async (params: { page?: number, limit?: number, search?: string, category?: string } = {}) => {
    if (!isAuthenticated) {
      return
    }

    const { installations: currentStored, ownerId: currentOwnerId, setInstallations: storeSetInstallations } = useInstallationStore.getState()
    const { userId: currentUserId } = useAuthStore.getState()
    const currentValidStored = currentOwnerId === currentUserId ? currentStored : []

    setLoading(true)
    setError(null)
    try {
      if (!navigator.onLine && currentValidStored.length > 0) {
        let filtered = [...currentValidStored];
        if (params.search) {
          const s = params.search.toLowerCase();
          filtered = filtered.filter(i => i.company.toLowerCase().includes(s) || i.address.toLowerCase().includes(s));
        }
        if (params.category) {
          filtered = filtered.filter(i => i.installationType === params.category);
        }
        
        const page = params.page || 1;
        const limit = params.limit || 10;
        const total = filtered.length;
        const startIndex = (page - 1) * limit;
        const paged = filtered.slice(startIndex, startIndex + limit);
        
        setFilteredOfflineInstallations(paged);
        setPagination({ total, page, limit, totalPages: Math.ceil(total / limit) || 1 });
        setLoading(false);
        return;
      }

      const result = await fetchInstallations(params)
      setFilteredOfflineInstallations(null)

      if (result.success && result.pagination) {
        storeSetInstallations(result.data)
        setPagination(result.pagination)
      } else {
        const installationsArray = Array.isArray(result) ? result : [];
        storeSetInstallations(installationsArray)
      }
    } catch (err: unknown) {
      if (currentValidStored.length > 0) {
        let filtered = [...currentValidStored];
        if (params.search) {
          const s = params.search.toLowerCase();
          filtered = filtered.filter(i => i.company.toLowerCase().includes(s) || i.address.toLowerCase().includes(s));
        }
        if (params.category) {
          filtered = filtered.filter(i => i.installationType === params.category);
        }
        
        const page = params.page || 1;
        const limit = params.limit || 10;
        const total = filtered.length;
        const startIndex = (page - 1) * limit;
        const paged = filtered.slice(startIndex, startIndex + limit);
        
        setFilteredOfflineInstallations(paged);
        setPagination({ total, page, limit, totalPages: Math.ceil(total / limit) || 1 });
        setLoading(false);
        return;
      }
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  const loadInstallationDetails = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const [installation, devices] = await Promise.all([fetchInstallationById(id), fetchInstallationDevices(id)])

      setCurrentInstallation(installation)
      setInstallationDevices(Array.isArray(devices) ? devices : [])
      return { installation, devices }
    } catch (err: unknown) {
      const storeState = useInstallationStore.getState()
      const authState = useAuthStore.getState()
      
      if (storeState.ownerId === authState.userId) {
        const cachedInst = storeState.installations.find(i => i._id === id)
        if (cachedInst) {
          setCurrentInstallation(cachedInst)
          setInstallationDevices(cachedInst.devices || [])
          setLoading(false)
          return { installation: cachedInst, devices: cachedInst.devices || [] }
        }
      }

      setError((err as Error).message)
      setCurrentInstallation(null)
      setInstallationDevices([])
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshInstallationDevices = useCallback(async (id: string) => {
    try {
      const devices = await fetchInstallationDevices(id)
      setInstallationDevices(Array.isArray(devices) ? devices : [])
    } catch (_err: unknown) {
    }
  }, [])

  const removeDeviceFromInstallation = useCallback(async (installationId: string, deviceId: string) => {
    if (!navigator.onLine) {
      setInstallationDevices((prev) => prev.filter((d) => d._id !== deviceId))
      useOfflineStore.getState().addToQueue({ 
        type: 'REMOVE_INSTALLATION_DEVICE', 
        payload: { installationId, deviceId },
        metadata: { installationId, deviceId }
      });
      return { message: t('installations.deviceDeletedLocal', { defaultValue: 'Dispositivo eliminado localmente.' }) }
    }
    try {
      await deleteDeviceFromInstallation(installationId, deviceId)
      setInstallationDevices((prev) => prev.filter((d) => d._id !== deviceId))
      return { message: t('installations.deviceDeleted') }
    } catch (err: unknown) {
      throw err
    }
  }, [t])

  // Removido useEffect automático - el componente controla cuándo cargar

  const handleFieldChange = async (name: string, value: string) => {
    const updatedData = { ...formData, [name]: value }
    setFormData(updatedData)

    const validation = await validateInstallationForm(updatedData, t)
    setFormErrors(validation.errors)
  }

  const handleSubmitForm = async (
    e: React.FormEvent,
    isEditMode: boolean,
    initialData: Installation | null,
    onSuccess: (message: string) => void,
    onError: (message: string) => void,
    onAdd: (data: Installation) => Promise<{ message: string }>,
    onEdit: (id: string, data: Installation) => Promise<{ message: string }>,
  ) => {
    e.preventDefault()
    setIsSubmitting(true)

    const validation = await validateInstallationForm(formData, t)

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
    } catch (err: unknown) {
      onError((err as Error).message || "Error al guardar instalación")
    } finally {
      setIsSubmitting(false)
    }
  }

  const addInstallation = async (installation: Installation): Promise<{ message: string }> => {
    if (!navigator.onLine) {
      const offlineId = `offline_${Date.now()}`;
      const offlineInst = { ...installation, _id: offlineId };
      storeAddInstallation(offlineInst);
      useOfflineStore.getState().addToQueue({ type: 'CREATE_INSTALLATION', payload: offlineInst });
      return { message: t('installations.installationCreatedLocal', { defaultValue: 'Instalación guardada localmente.' }) }
    }
    
    try {
      const newInstallation = await createInstallation(installation)
      storeAddInstallation(newInstallation)

      return { message: t('installations.installationCreated') }
    } catch (err: unknown) {
      throw err
    }
  }

  const editInstallation = async (id: string, updatedData: Installation): Promise<{ message: string }> => {
    if (!navigator.onLine) {
      storeUpdateInstallation(id, updatedData);
      useOfflineStore.getState().addToQueue({ type: 'UPDATE_INSTALLATION', payload: { id, data: updatedData } });
      return { message: t('installations.installationUpdatedLocal', { defaultValue: 'Cambios guardados localmente.' }) }
    }

    try {
      const updatedInstallation = await updateInstallation(id, updatedData)
      storeUpdateInstallation(id, updatedInstallation)

      return { message: t('installations.installationUpdated') }
    } catch (err: unknown) {
      throw err
    }
  }

  const removeInstallation = async (id: string): Promise<void> => {
    if (!navigator.onLine) {
      storeRemoveInstallation(id);
      useOfflineStore.getState().addToQueue({ type: 'DELETE_INSTALLATION', payload: { id } });
      return;
    }

    try {
      await deleteInstallation(id)
      storeRemoveInstallation(id)
    } catch (err: unknown) {
      throw err
    }
  }

  const addDeviceToInstallation = useCallback(async (installationId: string, device: Device): Promise<{ message: string }> => {
    if (!navigator.onLine) {
      const offlineId = `offline_dev_${Date.now()}`
      const completeDevice = { ...device, _id: offlineId }
      
      setInstallationDevices((prev) => [...prev, completeDevice])
      setInstallations(
        validStoredInstallations.map((inst) =>
          inst._id === installationId
            ? {
              ...inst,
              devices: [...(inst.devices || []), completeDevice],
            }
            : inst,
        ),
      )

      useOfflineStore.getState().addToQueue({ 
        type: 'ADD_INSTALLATION_DEVICE', 
        payload: device,
        metadata: { installationId }
      });
      return { message: t('installations.deviceAddedLocal', { defaultValue: 'Dispositivo agregado localmente.' }) }
    }
    try {
      const result = await apiAddDeviceToInstallation(installationId, device)

      // Usar el dispositivo devuelto por la API que incluye el _id generado
      const addedDevice = result as Partial<Device>

      // Asegurar que el dispositivo tenga todos los datos necesarios
      const completeDevice = {
        ...device,
        ...addedDevice,
        _id: addedDevice._id || device._id,
        nombre: device.nombre,
        ubicacion: device.ubicacion,
        categoria: device.categoria,
        estado: device.estado || "Activo",
        marca: device.marca,
        modelo: device.modelo,
        numeroSerie: device.numeroSerie,
      }

      setInstallationDevices((prev) => [...prev, completeDevice])

      setInstallations(
        validStoredInstallations.map((inst) =>
          inst._id === installationId
            ? {
              ...inst,
              devices: [...(inst.devices || []), completeDevice],
            }
            : inst,
        ),
      )

      return { message: t('installations.deviceAdded') }
    } catch (err: unknown) {
      throw err
    }
  }, [])

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
    installations: filteredOfflineInstallations || validStoredInstallations,
    lastUpdated,
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
    refreshInstallationDevices,
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
    pagination,
  }
}

export default useInstallations
