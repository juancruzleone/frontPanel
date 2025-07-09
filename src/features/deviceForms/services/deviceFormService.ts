import { useAuthStore } from "../../../store/authStore"

const API_URL = import.meta.env.VITE_API_URL

export const fetchDeviceForm = async (installationId: string, deviceId: string) => {
  const token = useAuthStore.getState().token
  const res = await fetch(
    `${API_URL}installations/${installationId}/dispositivos/${deviceId}/formulario`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Error ${res.status}`)
  }
  return res.json()
}

export const submitDeviceMaintenance = async (installationId: string, deviceId: string, formData: any) => {
  const token = useAuthStore.getState().token
  const res = await fetch(
    `${API_URL}installations/${installationId}/dispositivos/${deviceId}/mantenimiento`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(formData),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Error ${res.status}`)
  }
  return res.json()
} 