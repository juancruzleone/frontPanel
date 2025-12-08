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
      `${API_URL}public/dispositivos/${installationId}/${deviceId}/mantenimientos`
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
      `${API_URL}public/dispositivos/${installationId}/${deviceId}/ultimo-mantenimiento`
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
    console.log('🔍 [FRONTEND] Solicitando historial de mantenimientos...')
    console.log('📍 installationId:', installationId)
    console.log('📍 deviceId:', deviceId)
    
    const response = await fetch(
      `${API_URL}installations/${installationId}/dispositivos/${deviceId}/mantenimientos`,
      {
        headers: getAuthHeaders()
      }
    )

    console.log('📡 Response status:', response.status)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('❌ Error del servidor:', errorData)
      throw new Error(errorData.error || 'Error al obtener el historial de mantenimientos')
    }

    const data = await response.json()
    console.log('📦 Datos recibidos del backend:', data)
    console.log('✅ Total mantenimientos:', data.data?.length || 0)
    
    // Verificar pdfUrl en cada mantenimiento
    if (data.data && data.data.length > 0) {
      data.data.forEach((m: any, index: number) => {
        console.log(`   [${index + 1}] _id:`, m._id)
        console.log(`   [${index + 1}] date:`, m.date)
        console.log(`   [${index + 1}] pdfUrl:`, m.pdfUrl || '❌ NO TIENE pdfUrl')
      })
      
      const sinPdf = data.data.filter((m: any) => !m.pdfUrl)
      if (sinPdf.length > 0) {
        console.warn(`⚠️ ADVERTENCIA: ${sinPdf.length} mantenimientos SIN pdfUrl en frontend`)
      }
    } else {
      console.log('ℹ️ No hay mantenimientos en la respuesta')
    }
    
    return data.data || []
  } catch (error) {
    console.error('❌ Error en getMaintenanceHistory:', error)
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
      `${API_URL}public/dispositivos/${installationId}/${deviceId}/formulario`
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
