import { useAuthStore } from '../../../store/authStore'

const API_URL = import.meta.env.VITE_API_URL

export const updateSubscription = async (subscriptionId: string, updateData: any) => {
  const token = useAuthStore.getState().token
  const { _id, image, ...rest } = updateData
  const updatePayload = {
    ...rest,
    ...(typeof updateData.image === "string" ? { image: updateData.image } : {}),
  }
  const response = await fetch(`${API_URL}installations/${subscriptionId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updatePayload),
  })
  if (!response.ok) throw new Error("Error al actualizar instalación")
  return await response.json()
} 