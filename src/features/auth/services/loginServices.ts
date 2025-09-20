import { useAuthStore } from "../../../store/authStore"

const API_URL = import.meta.env.VITE_API_URL || "/api/";
console.log("API_URL:", API_URL)
console.log("ENV:", import.meta.env);

export const userLogin = async (username: string, password: string) => {
  const response = await fetch(`${API_URL}cuenta/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Tenant-ID": "051935e5-1c2f-4661-82a5-587f78c99e5d", // Tenant ID por defecto para login
    },
    body: JSON.stringify({ userName: username, password }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error.message || "Error al enviar la solicitud")
  }

  return await response.json()
}
