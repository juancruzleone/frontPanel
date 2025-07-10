import { useAuthStore } from "../../../store/authStore"

const API_URL = import.meta.env.VITE_API_URL

const getToken = () => {
  return useAuthStore.getState().token
}

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Error de conexión" }))
    throw new Error(error.message || `Error ${response.status}: ${response.statusText}`)
  }
  return await response.json()
}

export const fetchFormTemplates = async () => {
  const token = getToken()
  const response = await fetch(`${API_URL}plantillas`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  return handleResponse(response)
}

export const fetchFormTemplateById = async (id: string) => {
  const token = getToken()
  const response = await fetch(`${API_URL}plantillas/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  return handleResponse(response)
}

export const fetchFormTemplatesByCategory = async (category: string) => {
  const token = getToken()
  const response = await fetch(`${API_URL}plantillas/categoria/${encodeURIComponent(category)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  return handleResponse(response)
}

export const createFormTemplate = async (templateData: any) => {
  const token = getToken()
  const response = await fetch(`${API_URL}plantillas`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(templateData),
  })
  return handleResponse(response)
}

export const updateFormTemplate = async (id: string, templateData: any) => {
  const token = getToken()
  const response = await fetch(`${API_URL}plantillas/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(templateData),
  })
  return handleResponse(response)
}

export const deleteFormTemplate = async (id: string) => {
  const token = getToken()
  const response = await fetch(`${API_URL}plantillas/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Error de conexión" }))
    throw new Error(error.message || `Error ${response.status}: ${response.statusText}`)
  }

  // Para DELETE, puede que no haya contenido en la respuesta
  if (response.status === 204) {
    return { message: "Plantilla eliminada correctamente" }
  }

  return await response.json()
}

// Funciones para categorías de formularios
export const fetchFormCategories = async () => {
  const token = getToken()
  const response = await fetch(`${API_URL}categorias-formularios`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  return handleResponse(response)
}

export const fetchFormCategoryById = async (id: string) => {
  const token = getToken()
  const response = await fetch(`${API_URL}categorias-formularios/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  return handleResponse(response)
}

export const createFormCategory = async (categoryData: any) => {
  const token = getToken()
  const response = await fetch(`${API_URL}categorias-formularios`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(categoryData),
  })
  return handleResponse(response)
}

export const updateFormCategory = async (id: string, categoryData: any) => {
  const token = getToken()
  const response = await fetch(`${API_URL}categorias-formularios/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(categoryData),
  })
  return handleResponse(response)
}

export const deleteFormCategory = async (id: string) => {
  const token = getToken()
  const response = await fetch(`${API_URL}categorias-formularios/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Error de conexión" }))
    throw new Error(error.message || `Error ${response.status}: ${response.statusText}`)
  }

  return await response.json()
}
