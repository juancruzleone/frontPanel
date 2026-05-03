import { useAuthStore } from '../../../store/authStore'
import { getHeadersWithContentType } from '../../../shared/utils/apiHeaders'

const API_URL = import.meta.env.VITE_API_URL || "/api/"

export const updateSubscription = async (subscriptionId: string, updateData: Record<string, any>) => {
  // Obtener el token del store
  const isAuthenticated = useAuthStore.getState().isAuthenticated
  if (!isAuthenticated) {
    throw new Error('Token de autorización requerido')
  }

  // IMPORTANTE: Enviar solo los campos requeridos por validateSubscriptionUpdate
  const updatePayload = {
    fechaInicio: updateData.fechaInicio,
    fechaFin: updateData.fechaFin,
    frecuencia: updateData.frecuencia?.trim(),
    mesesFrecuencia: updateData.mesesFrecuencia,
    estado: updateData.estado,
    // La nueva API no espera generacionAutomatica en este endpoint, pero si es necesario se envía
  }

  // Asegurarse de que la URL esté bien formada
  const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL
  // Usar la nueva ruta PATCH de subscription
  const url = `${baseUrl}/installations/${subscriptionId}/subscription`

  const response = await fetch(url, {
    method: "PATCH",
    headers: getHeadersWithContentType('PATCH'),
    body: JSON.stringify(updatePayload),
  })

  const data = await response.json()

  if (!response.ok) {
    // Si hay un mensaje de error específico del servidor, usarlo
    // El servidor de validación de Yup suele emitir data.error (array) o data.message
    const errorMsg = data.error ? JSON.stringify(data.error) : data.message
    throw new Error(errorMsg || "Error al actualizar suscripción")
  }

  return data
}

export const triggerAutomaticWorkOrdersGeneration = async () => {
  const isAuthenticated = useAuthStore.getState().isAuthenticated
  if (!isAuthenticated) {
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
        headers: getHeadersWithContentType('POST'),
      })
      if (response.ok) {
        return await response.json()
      }
      lastError = new Error(`Error ${response.status}: ${response.statusText}`)
    } catch (error: unknown) {
      lastError = error as Error
    }
  }

  throw lastError || new Error('No se pudo generar órdenes automáticas')
}

