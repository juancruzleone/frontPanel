import { useAuthStore } from "../../../store/authStore"
import { getAuthHeaders, getHeadersWithContentType } from "../../../shared/utils/apiHeaders"

const API_URL = import.meta.env.VITE_API_URL

export const fetchDeviceForm = async (installationId: string, deviceId: string) => {
  const res = await fetch(
    `${API_URL}installations/${installationId}/dispositivos/${deviceId}/formulario`,
    {
      headers: getAuthHeaders(),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Error ${res.status}`)
  }
  return res.json()
}

export const submitDeviceMaintenance = async (installationId: string, deviceId: string, formData: any) => {
  const res = await fetch(
    `${API_URL}installations/${installationId}/dispositivos/${deviceId}/mantenimiento`,
    {
      method: "POST",
      headers: getHeadersWithContentType(),
      body: JSON.stringify(formData),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Error ${res.status}`)
  }
  return res.json()
} 