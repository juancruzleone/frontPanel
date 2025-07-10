import { useEffect, useState } from "react"
import { fetchDeviceForm, submitDeviceMaintenance } from "../services/deviceFormService"

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

interface OfflineSubmission {
  id: string
  installationId: string
  deviceId: string
  formData: Record<string, any>
  timestamp: number
  retryCount: number
}

const useDeviceForm = (installationId?: string, deviceId?: string) => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null)
  const [formFields, setFormFields] = useState<FormField[]>([])
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingSubmissions, setPendingSubmissions] = useState<OfflineSubmission[]>([])

  // Verificar estado de conexión
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      syncPendingSubmissions()
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Cargar formulario
  useEffect(() => {
    const fetchForm = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchDeviceForm(installationId!, deviceId!)
        setDeviceInfo(data.data.deviceInfo)
        setFormFields(data.data.formFields)
        // Inicializar formData con valores vacíos
        const initialData: Record<string, any> = {}
        data.data.formFields.forEach((field: FormField) => {
          initialData[field.name] = ""
        })
        setFormData(initialData)
      } catch (e: any) {
        setError(e.message || "Error al cargar el formulario")
      } finally {
        setLoading(false)
      }
    }
    if (installationId && deviceId) {
      fetchForm()
    }
  }, [installationId, deviceId])

  // Cargar envíos pendientes al inicializar
  useEffect(() => {
    loadPendingSubmissions()
  }, [])

  // Funciones para manejo offline
  const loadPendingSubmissions = () => {
    try {
      const stored = localStorage.getItem('pendingMaintenanceSubmissions')
      if (stored) {
        const submissions: OfflineSubmission[] = JSON.parse(stored)
        setPendingSubmissions(submissions)
      }
    } catch (error) {
      console.error('Error loading pending submissions:', error)
    }
  }

  const savePendingSubmission = (submission: OfflineSubmission) => {
    try {
      const current = pendingSubmissions
      const updated = [...current, submission]
      setPendingSubmissions(updated)
      localStorage.setItem('pendingMaintenanceSubmissions', JSON.stringify(updated))
    } catch (error) {
      console.error('Error saving pending submission:', error)
    }
  }

  const removePendingSubmission = (id: string) => {
    try {
      const updated = pendingSubmissions.filter(sub => sub.id !== id)
      setPendingSubmissions(updated)
      localStorage.setItem('pendingMaintenanceSubmissions', JSON.stringify(updated))
    } catch (error) {
      console.error('Error removing pending submission:', error)
    }
  }

  const syncPendingSubmissions = async () => {
    if (!isOnline || pendingSubmissions.length === 0) return

    const submissionsToSync = [...pendingSubmissions]
    
    for (const submission of submissionsToSync) {
      try {
        await submitDeviceMaintenance(
          submission.installationId,
          submission.deviceId,
          submission.formData
        )
        removePendingSubmission(submission.id)
        console.log('✅ Sincronizado envío pendiente:', submission.id)
      } catch (error) {
        console.error('❌ Error sincronizando envío:', submission.id, error)
        // Incrementar contador de reintentos
        const updatedSubmission = {
          ...submission,
          retryCount: submission.retryCount + 1
        }
        
        if (updatedSubmission.retryCount >= 3) {
          // Eliminar si ha fallado demasiadas veces
          removePendingSubmission(submission.id)
          console.log('🗑️ Eliminando envío con demasiados fallos:', submission.id)
        } else {
          // Actualizar con nuevo contador
          const updated = pendingSubmissions.map(sub => 
            sub.id === submission.id ? updatedSubmission : sub
          )
          setPendingSubmissions(updated)
          localStorage.setItem('pendingMaintenanceSubmissions', JSON.stringify(updated))
        }
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    let newValue: any = value
    if (type === "checkbox") {
      newValue = (e.target as HTMLInputElement).checked
    }
    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      if (isOnline) {
        // Enviar directamente si hay conexión
        await submitDeviceMaintenance(installationId!, deviceId!, formData)
        setSuccess("¡Mantenimiento registrado exitosamente!")
      } else {
        // Guardar para envío posterior si no hay conexión
        const submission: OfflineSubmission = {
          id: `submission_${Date.now()}_${Math.random()}`,
          installationId: installationId!,
          deviceId: deviceId!,
          formData: { ...formData },
          timestamp: Date.now(),
          retryCount: 0
        }
        
        savePendingSubmission(submission)
        setSuccess("Mantenimiento guardado. Se enviará automáticamente cuando haya conexión.")
        
        // Limpiar formulario
        const initialData: Record<string, any> = {}
        formFields.forEach((field: FormField) => {
          initialData[field.name] = ""
        })
        setFormData(initialData)
      }
    } catch (e: any) {
      if (isOnline) {
        setError(e.message || "Error al enviar el formulario")
      } else {
        setError("Error al guardar el formulario offline")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return {
    deviceInfo,
    formFields,
    formData,
    loading,
    error,
    success,
    submitting,
    isOnline,
    pendingSubmissions,
    handleChange,
    handleSubmit,
    syncPendingSubmissions,
  }
}

export default useDeviceForm 