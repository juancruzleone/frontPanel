import { fetchWithCsrf, getAuthHeaders } from "../../../shared/utils/apiHeaders"

// Re-export canonical installation services to avoid duplication and ensure pagination support
export {
  fetchInstallationById,
  fetchInstallationDevices,
  createInstallation,
  updateInstallation,
  deleteInstallation,
  addDeviceToInstallation,
  deleteDeviceFromInstallation,
  updateDeviceInInstallation,
  assignTemplateToDevice,
  fetchAssets,
} from "../../installations/services/installationServices"

import { fetchInstallations as canonicalFetchInstallations } from "../../installations/services/installationServices"

const API_URL = import.meta.env.VITE_API_URL || "/api/"

export const fetchInstallations = async (params?: {
  page?: number
  limit?: number
  search?: string
  category?: string
}) => {
  return canonicalFetchInstallations(params ?? { limit: 100 })
}

export const getLastMaintenanceForDevice = async (installationId: string, deviceId: string) => {
  const response = await fetchWithCsrf(
    `${API_URL}installations/${installationId}/dispositivos/${deviceId}/ultimo-mantenimiento`,
    {
      headers: getAuthHeaders(),
    },
  )

  if (!response.ok) {
    if (response.status === 404) {
      return null
    }
    throw new Error("Error al obtener el último mantenimiento")
  }

  const result = await response.json()
  return result.success ? result.data : result
}
