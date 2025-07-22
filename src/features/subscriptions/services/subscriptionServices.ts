import { useAuthStore } from '../../../store/authStore'

const API_URL = import.meta.env.VITE_API_URL

export const updateSubscription = async (subscriptionId: string, updateData: any) => {
  // Obtener el token del store
  const token = useAuthStore.getState().token
  
  if (!token) {
    throw new Error('Token de autorización requerido')
  }
  
  // Preparar el payload eliminando propiedades no necesarias
  const { _id, image, ...rest } = updateData
  
  const updatePayload = {
    ...rest,
    // Solo incluir imagen si es string (URL)
    ...(typeof updateData.image === "string" ? { image: updateData.image } : {}),
  }
  
  // Asegurarse de que la URL esté bien formada
  const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL
  const url = `${baseUrl}/installations/${subscriptionId}`
  
  console.log('Updating subscription:', url)
  console.log('Update payload:', updatePayload)
  console.log('Token exists:', !!token)
  
  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(updatePayload),
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      // Si hay un mensaje de error específico del servidor, usarlo
      console.error('Update error:', data)
      throw new Error(data.error?.message || data.message || "Error al actualizar instalación")
    }
    
    return data
  } catch (error: any) {
    console.error('Subscription update error:', error)
    // Re-lanzar el error para que sea manejado por el componente
    throw error
  }
}