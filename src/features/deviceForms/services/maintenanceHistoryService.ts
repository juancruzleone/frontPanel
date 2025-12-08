import { getAuthHeaders } from '../../../shared/utils/apiHeaders'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export interface MaintenanceRecord {
  _id: string
  date: string
  formattedDate: string
  responses: any
  pdfUrl: string
}

/**
 * Obtener historial completo de mantenimientos (público - sin autenticación)
 */
export const getPublicMaintenanceHistory = async (
  installationId: string,
  deviceId: string
): Promise<MaintenanceRecord[]> => {
  try {
    const response = await fetch(
      `${API_URL}/api/public/dispositivos/${installationId}/${deviceId}/mantenimientos`
    )

    if (!response.ok) {
      throw new Error('Error al obtener el historial de mantenimientos')
    }

    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.error('Error en getPublicMaintenanceHistory:', error)
    throw error
  }
}

/**
 * Obtener último mantenimiento (público - sin autenticación)
 */
export const getPublicLastMaintenance = async (
  installationId: string,
  deviceId: string
): Promise<MaintenanceRecord | null> => {
  try {
    const response = await fetch(
      `${API_URL}/api/public/dispositivos/${installationId}/${deviceId}/ultimo-mantenimiento`
    )

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error('Error al obtener el último mantenimiento')
    }

    const data = await response.json()
    return data.data || null
  } catch (error) {
    console.error('Error en getPublicLastMaintenance:', error)
    throw error
  }
}

/**
 * Obtener historial completo de mantenimientos (autenticado)
 */
export const getMaintenanceHistory = async (
  installationId: string,
  deviceId: string
): Promise<MaintenanceRecord[]> => {
  try {
    const response = await fetch(
      `${API_URL}/api/installations/${installationId}/dispositivos/${deviceId}/mantenimientos`,
      {
        headers: getAuthHeaders()
      }
    )

    if (!response.ok) {
      throw new Error('Error al obtener el historial de mantenimientos')
    }

    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.error('Error en getMaintenanceHistory:', error)
    throw error
  }
}

/**
 * Obtener formulario de dispositivo (público - sin autenticación)
 */
export const getPublicDeviceForm = async (
  installationId: string,
  deviceId: string
): Promise<any> => {
  try {
    const response = await fetch(
      `${API_URL}/api/public/dispositivos/${installationId}/${deviceId}/formulario`
    )

    if (!response.ok) {
      throw new Error('Error al obtener la información del dispositivo')
    }

    const data = await response.json()
    return data.data || null
  } catch (error) {
    console.error('Error en getPublicDeviceForm:', error)
    throw error
  }
}
