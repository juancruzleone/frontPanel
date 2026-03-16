import { useAuthStore } from '../../../store/authStore'
import { getHeadersWithContentType } from '../../../shared/utils/apiHeaders'
import { updateInstallation } from '../../installations/services/installationServices'

const API_URL = import.meta.env.VITE_API_URL

export const updateSubscription = async (subscriptionId: string, updateData: any) => {
  console.log('🚀 updateSubscription - Usando servicio de installationServices')
  
  // SOLUCIÓN: Usar el servicio updateInstallation que SÍ FUNCIONA
  // en lugar de hacer fetch directamente
  try {
    const result = await updateInstallation(subscriptionId, updateData)
    console.log('✅ Suscripción actualizada exitosamente')
    return result
  } catch (error: any) {
    console.error('❌ Error al actualizar:', error)
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
