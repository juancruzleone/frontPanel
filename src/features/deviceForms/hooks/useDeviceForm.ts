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
  _id: string
  assetId: string
  nombre: string
  marca: string
  modelo: string
  numeroSerie: string
  ubicacion: string
  categoria: string
  templateId?: string
}

const useDeviceForm = (installationId?: string, deviceId?: string) => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null)
  const [formFields, setFormFields] = useState<FormField[]>([])
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

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
      await submitDeviceMaintenance(installationId!, deviceId!, formData)
      setSuccess("¡Mantenimiento registrado exitosamente!")
    } catch (e: any) {
      setError(e.message || "Error al enviar el formulario")
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
    handleChange,
    handleSubmit,
  }
}

export default useDeviceForm 