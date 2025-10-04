import { useAuthStore } from '../../../store/authStore'
import { getHeadersWithContentType } from '../../../shared/utils/apiHeaders'

const API_URL = import.meta.env.VITE_API_URL

export const updateSubscription = async (subscriptionId: string, updateData: any) => {
  // Obtener el token del store
  const token = useAuthStore.getState().token
  
  if (!token) {
    throw new Error('Token de autorización requerido')
  }
  
  // Mapear los campos del frontend a los campos esperados por el backend
  console.log('🔍 [SERVICE] updateData recibido:', updateData)
  console.log('🔍 [SERVICE] updateData.estado:', updateData.estado)
  
  const updatePayload = {
    fechaInicio: updateData.fechaInicio,
    fechaFin: updateData.fechaFin,
    frecuencia: updateData.frecuencia,
    mesesFrecuencia: updateData.mesesFrecuencia,
    estado: updateData.estado,
  }
  
  console.log('🔍 [SERVICE] updatePayload.estado:', updatePayload.estado)
  
  // Asegurarse de que la URL esté bien formada
  const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL
  // Usar la ruta PATCH de suscripción
  const url = `${baseUrl}/installations/${subscriptionId}/subscription`
  
  console.log('Updating subscription:', url)
  console.log('Update payload:', updatePayload)
  console.log('Token exists:', !!token)
  
  try {
    const response = await fetch(url, {
      method: "PATCH",
      headers: getHeadersWithContentType(),
      body: JSON.stringify(updatePayload),
    })
    
    const data = await response.json()
    
    console.log('Backend response:', data)
    console.log('Response status:', response.status)
    
    if (!response.ok) {
      // Si hay un mensaje de error específico del servidor, usarlo
      console.error('Update error:', data)
      throw new Error(data.error?.message || data.message || "Error al actualizar suscripción")
    }
    
    console.log('Subscription updated successfully. Response data:', data)
    return data
  } catch (error: any) {
    console.error('Subscription update error:', error)
    // Re-lanzar el error para que sea manejado por el componente
    throw error
  }
}