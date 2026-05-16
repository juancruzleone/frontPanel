import { fetchWithCsrf, getAuthHeaders } from "../../../shared/utils/apiHeaders"
import { createApiResponseError } from "../../../shared/utils/errorHelpers"

const API_URL = import.meta.env.VITE_API_URL || "/api/"

export const fetchDeviceForm = async (installationId: string, deviceId: string) => {
  const res = await fetch(
    `${API_URL}installations/${installationId}/dispositivos/${deviceId}/formulario`,
    {
      credentials: "include",
      headers: getAuthHeaders(),
    },
  )
  if (!res.ok) {
    throw await createApiResponseError(res, "Error al cargar el formulario")
  }
  return res.json()
}

export const submitDeviceMaintenance = async (installationId: string, deviceId: string, formData: Record<string, unknown>) => {
  const res = await fetchWithCsrf(
    `${API_URL}installations/${installationId}/dispositivos/${deviceId}/mantenimiento`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    },
  )
  if (!res.ok) {
    throw await createApiResponseError(res, "Error al registrar el mantenimiento")
  }
  return res.json()
} 
