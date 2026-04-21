import { getAuthHeaders } from "../utils/apiHeaders"

const API_URL = import.meta.env.VITE_API_URL || "/api/"

export interface CSRFServiceResponse {
  token: string
}

export const fetchCsrfToken = async (): Promise<CSRFServiceResponse> => {
  const headers = getAuthHeaders()
  
  const response = await fetch(`${API_URL}csrf-token`, {
    method: "GET",
    credentials: "include",
    headers: {
      ...headers,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || "Error al obtener token CSRF")
  }

  const data = await response.json()
  return data
}
