import { useEffect, useState, useRef } from "react"
import { fetchDeviceForm, submitDeviceMaintenance } from "../services/deviceFormService"
import { useTranslation } from "react-i18next"
import { offlineSyncService } from "../../../shared/services/offlineSyncService"
import { useOfflineStore } from "../../../store/offlineStore"

interface FormField {
  name: string
  label: string
  type: string
  required?: boolean
  options?: string[]
}

interface DeviceInfo {
  nombre: string
  ubicacion: string
  categoria: string
  marca: string
  modelo: string
  numeroSerie: string
}

interface InstallationInfo {
  _id: string
  company: string
  address: string
  floorSector?: string
  city: string
  province: string
  installationType: string
  fullAddress: string
}

interface OfflineSubmission {
  id: string
  installationId: string
  deviceId: string
  formData: Record<string, unknown>
  timestamp: number
  retryCount: number
}

type DeviceFormCache = {
  deviceInfo: DeviceInfo
  installationInfo: InstallationInfo
  formFields: FormField[]
  cachedAt: number
}

const getDeviceFormCacheKey = (installationId: string, deviceId: string) =>
  `deviceFormCache:${installationId}:${deviceId}`

const useDeviceForm = (installationId?: string, deviceId?: string) => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null)
  const [installationInfo, setInstallationInfo] = useState<InstallationInfo | null>(null)
  const [formFields, setFormFields] = useState<FormField[]>([])
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const addToQueue = useOfflineStore(state => state.addToQueue)
  const queue = useOfflineStore(state => state.queue)
  
  // Filtrar solo los mantenimientos pendientes
  const pendingSubmissions = queue
    .filter(req => req.type === 'DEVICE_MAINTENANCE')
    .map(req => ({
      id: req.id,
      installationId: req.metadata?.installationId || '',
      deviceId: req.metadata?.deviceId || '',
      formData: req.payload,
      timestamp: req.timestamp,
      retryCount: req.retries || 0
    }))

  const isSyncingRef = useRef(false)
  
  // Estados para fotos, firma y repuestos
  const [fotosEvidencia, setFotosEvidencia] = useState<string[]>([])
  const [firmaTecnico, setFirmaTecnico] = useState<string>("")
  const [repuestosUsados, setRepuestosUsados] = useState<{ itemId: string, nombre: string, cantidad: number, unidad: string }[]>([])

  // Verificar estado de conexión
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Sincronizar cuando vuelve la conexión
  useEffect(() => {
    if (isOnline && pendingSubmissions.length > 0) {
      // offlineSyncService ya escucha el evento 'online', 
      // así que no necesitamos llamar a syncPendingSubmissions aquí duplicado.
    }
  }, [isOnline, pendingSubmissions.length])

  // Cargar formulario
  useEffect(() => {
    const fetchForm = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchDeviceForm(installationId!, deviceId!)
        setDeviceInfo(data.data.deviceInfo)
        setInstallationInfo(data.data.installationInfo)
        setFormFields(data.data.formFields)
        localStorage.setItem(
          getDeviceFormCacheKey(installationId!, deviceId!),
          JSON.stringify({
            deviceInfo: data.data.deviceInfo,
            installationInfo: data.data.installationInfo,
            formFields: data.data.formFields,
            cachedAt: Date.now(),
          } satisfies DeviceFormCache),
        )

        // Inicializar formData con valores apropiados según el tipo
        const initialData: Record<string, unknown> = {}
        data.data.formFields.forEach((field: FormField) => {
          if (field.type === "checkbox") {
            // Los checkboxes deben inicializarse en false, no en cadena vacía
            initialData[field.name] = false
          } else if (field.type === "select") {
            // Los selects deben inicializarse con cadena vacía
            initialData[field.name] = ""
          } else if (field.type === "date") {
            // Las fechas pueden inicializarse vacías
            initialData[field.name] = ""
          } else {
            // Otros campos (text, textarea, etc.)
            initialData[field.name] = ""
          }
        })
        setFormData(initialData)
      } catch (e: unknown) {
        const cached = localStorage.getItem(getDeviceFormCacheKey(installationId!, deviceId!))
        if (cached) {
          try {
            const cachedForm = JSON.parse(cached) as DeviceFormCache
            setDeviceInfo(cachedForm.deviceInfo)
            setInstallationInfo(cachedForm.installationInfo)
            setFormFields(cachedForm.formFields)
            const initialData: Record<string, unknown> = {}
            cachedForm.formFields.forEach((field: FormField) => {
              initialData[field.name] = field.type === "checkbox" ? false : ""
            })
            setFormData(initialData)
            setError(null)
          } catch {
            setError(e instanceof Error ? e.message : "Error al cargar el formulario")
          }
        } else {
          setError(e instanceof Error ? e.message : "Error al cargar el formulario")
        }
      } finally {
        setLoading(false)
      }
    }
    if (installationId && deviceId) {
      fetchForm()
    }
  }, [installationId, deviceId])

  // Funciones para manejo offline (Redundantes con useOfflineStore)

  const syncPendingSubmissions = async () => {
    // offlineSyncService maneja la sincronización global ahora
    await offlineSyncService.syncAll()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    let newValue: unknown = value
    if (type === "checkbox") {
      newValue = (e.target as HTMLInputElement).checked
    }
    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => {
      const newData = {
        ...prev,
        [name]: value,
      };

      return newData;
    })
  }

  const handleSelectBlur = (name: string) => {
  }

  // Funciones para manejo de fotos
  const handlePhotoUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : ""
      setFotosEvidencia(prev => [...prev, result])
    }
    reader.readAsDataURL(file)
  }

  const handlePhotoRemove = (index: number) => {
    setFotosEvidencia(prev => prev.filter((_, i) => i !== index))
  }

  // Funciones para manejo de firma
  const handleSignatureChange = (dataUrl: string) => {
    setFirmaTecnico(dataUrl)
  }

  const clearSignature = () => {
    setFirmaTecnico("")
  }

  const addRepuesto = (repuesto: { itemId: string, nombre: string, cantidad: number, unidad: string }) => {
    setRepuestosUsados(prev => [...prev, repuesto])
  }

  const removeRepuesto = (itemId: string) => {
    setRepuestosUsados(prev => prev.filter(r => r.itemId !== itemId))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      // Verificar campos requeridos vacíos
      const emptyRequiredFields = formFields.filter(f =>
        f.required && (!formData[f.name] || formData[f.name] === "")
      );
      if (emptyRequiredFields.length > 0) {
        throw new Error("Por favor completa todos los campos requeridos");
      }

      // Verificar que haya firma
      if (!firmaTecnico) {
        throw new Error("La firma digital es obligatoria");
      }

      // Preparar datos con fotos, firma y repuestos
      const dataToSubmit = {
        ...formData,
        fotosEvidencia,
        firmaTecnico,
        repuestosUsados
      }

      if (isOnline) {
        // Enviar directamente si hay conexión
        await submitDeviceMaintenance(installationId!, deviceId!, dataToSubmit)
        setSuccess("¡Mantenimiento registrado exitosamente!")

        // Limpiar formulario manteniendo los tipos correctos
        const initialData: Record<string, unknown> = {}
        formFields.forEach((field: FormField) => {
          if (field.type === "checkbox") {
            initialData[field.name] = false
          } else {
            initialData[field.name] = ""
          }
        })
        setFormData(initialData)
        setFotosEvidencia([])
        setFirmaTecnico("")
        setRepuestosUsados([])
      } else {
        // Guardar para envío posterior si no hay conexión
        addToQueue({
          type: 'DEVICE_MAINTENANCE',
          payload: dataToSubmit,
          metadata: {
            installationId,
            deviceId
          }
        })

        offlineSyncService.registerBackgroundSync()
        setSuccess("Mantenimiento guardado. Se enviará automáticamente cuando haya conexión.")

        // Limpiar formulario manteniendo los tipos correctos
        const initialData: Record<string, unknown> = {}
        formFields.forEach((field: FormField) => {
          if (field.type === "checkbox") {
            initialData[field.name] = false
          } else {
            initialData[field.name] = ""
          }
        })
        setFormData(initialData)
        setFotosEvidencia([])
        setFirmaTecnico("")
        setRepuestosUsados([])
      }
    } catch (e: unknown) {
      if (isOnline) {
        setError(e instanceof Error ? e.message : "Error al enviar el formulario")
      } else {
        setError("Error al guardar el formulario offline")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return {
    deviceInfo,
    installationInfo,
    formFields,
    formData,
    loading,
    error,
    success,
    submitting,
    isOnline,
    pendingSubmissions,
    handleChange,
    handleSelectChange,
    handleSelectBlur,
    handleSubmit,
    syncPendingSubmissions,
    handlePhotoUpload,
    handlePhotoRemove,
    handleSignatureChange,
    clearSignature,
    addRepuesto,
    removeRepuesto,
    repuestosUsados,
    fotosEvidencia,
    firmaTecnico
  }
}

export default useDeviceForm
