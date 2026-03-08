import { useAuthStore } from "../../../store/authStore"

const API_URL = import.meta.env.VITE_API_URL || "/api/";

export const userLogin = async (username: string, password: string) => {
  const response = await fetch(`${API_URL}cuenta/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userName: username, password }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error.message || "Error al enviar la solicitud")
  }

  const data = await response.json()
  return data
}
