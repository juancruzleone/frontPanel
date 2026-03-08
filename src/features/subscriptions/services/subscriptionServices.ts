import { useAuthStore } from '../../../store/authStore'
import { getHeadersWithContentType } from '../../../shared/utils/apiHeaders'

const API_URL = import.meta.env.VITE_API_URL

export const updateSubscription = async (subscriptionId: string, updateData: any) => {
  // Obtener el token del store
  const token = useAuthStore.getState().token
  
  if (!token) {
    throw new Error('Token de autorización requerido')
  }
  
  const updatePayload = {
    fechaInicio: updateData.fechaInicio,
    fechaFin: updateData.fechaFin,
    frecuencia: updateData.frecuencia,
    mesesFrecuencia: updateData.mesesFrecuencia,
    estado: updateData.estado,
    generacionAutomatica: updateData.generacionAutomatica,
    fechaInicioGeneracion: updateData.fechaInicio,
    fechaFinGeneracion: updateData.fechaFin,
  }
  
  // Asegurarse de que la URL esté bien formada
  const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL
  // Usar la ruta PATCH de suscripción
  const url = `${baseUrl}/installations/${subscriptionId}/subscription`
  
  try {
    const response = await fetch(url, {
      method: "PATCH",
      headers: getHeadersWithContentType(),
      body: JSON.stringify(updatePayload),
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      // Si hay un mensaje de error específico del servidor, usarlo
      throw new Error(data.error?.message || data.message || "Error al actualizar suscripción")
    }
    
    return data
  } catch (error: any) {
    // Re-lanzar el error para que sea manejado por el componente
    throw error
  }
}

export const triggerAutomaticWorkOrdersGeneration = async () => {
  const token = useAuthStore.getState().token
  if (!token) {
    throw new Error('Token de autorización requerido')
  }

  const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL
  const endpoints = [
    `${baseUrl}/preventivo/ejecutar`,
    `${baseUrl}/ordenes-trabajo/generar-desde-abonos`,
    `${baseUrl}/ordenes-trabajo/generar-automaticas`,
    `${baseUrl}/subscriptions/generate-work-orders`,
  ]

  let lastError: Error | null = null
  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: getHeadersWithContentType(),
      })
      if (response.ok) {
        return await response.json()
      }
      lastError = new Error(`Error ${response.status}: ${response.statusText}`)
    } catch (error: any) {
      lastError = error
    }
  }

  throw lastError || new Error('No se pudo generar órdenes automáticas')
}
