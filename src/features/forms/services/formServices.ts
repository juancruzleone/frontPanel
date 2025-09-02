import { useAuthStore } from "../../../store/authStore"
import { getAuthHeaders, getHeadersWithContentType } from "../../../shared/utils/apiHeaders"

const API_URL = import.meta.env.VITE_API_URL

const getToken = () => {
  return useAuthStore.getState().token
}

export const fetchFormTemplates = async () => {
  const response = await fetch(`${API_URL}plantillas`, {
    headers: getAuthHeaders(),
  })
  if (!response.ok) throw new Error("Error al obtener plantillas")
  const result = await response.json()
  return result.success ? result.data : result
}

export const fetchFormTemplateById = async (id: string) => {
  const response = await fetch(`${API_URL}plantillas/${id}`, {
    headers: getAuthHeaders(),
  })
  if (!response.ok) throw new Error("Error al obtener plantilla")
  const result = await response.json()
  return result.success ? result.data : result
}

export const fetchFormTemplatesByCategory = async (category: string) => {
  const response = await fetch(`${API_URL}plantillas/categoria/${encodeURIComponent(category)}`, {
    headers: getAuthHeaders(),
  })
  if (!response.ok) throw new Error("Error al obtener plantillas por categoría")
  const result = await response.json()
  return result.success ? result.data : result
}

export const createFormTemplate = async (templateData: any) => {
  const response = await fetch(`${API_URL}plantillas`, {
    method: "POST",
    headers: getHeadersWithContentType(),
    body: JSON.stringify(templateData),
  })
  if (!response.ok) throw new Error("Error al crear plantilla")
  const result = await response.json()
  return result.success ? result.data : result
}

export const updateFormTemplate = async (id: string, templateData: any) => {
  const response = await fetch(`${API_URL}plantillas/${id}`, {
    method: "PUT",
    headers: getHeadersWithContentType(),
    body: JSON.stringify(templateData),
  })
  if (!response.ok) throw new Error("Error al actualizar plantilla")
  const result = await response.json()
  return result.success ? result.data : result
}

export const deleteFormTemplate = async (id: string) => {
  const response = await fetch(`${API_URL}plantillas/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  })

  if (!response.ok) throw new Error("Error al eliminar plantilla")

  // Para DELETE, puede que no haya contenido en la respuesta
  if (response.status === 204) {
    return { message: "Plantilla eliminada correctamente" }
  }

  const result = await response.json()
  return result.success ? result.data : result
}

// Funciones para categorías de formularios
export const fetchFormCategories = async () => {
  const response = await fetch(`${API_URL}categorias-formularios`, {
    headers: getAuthHeaders(),
  })
  if (!response.ok) throw new Error("Error al obtener categorías")
  const result = await response.json()
  return result.success ? result.data : result
}

export const fetchFormCategoryById = async (id: string) => {
  const response = await fetch(`${API_URL}categorias-formularios/${id}`, {
    headers: getAuthHeaders(),
  })
  if (!response.ok) throw new Error("Error al obtener categoría")
  const result = await response.json()
  return result.success ? result.data : result
}

export const createFormCategory = async (categoryData: any) => {
  const response = await fetch(`${API_URL}categorias-formularios`, {
    method: "POST",
    headers: getHeadersWithContentType(),
    body: JSON.stringify(categoryData),
  })
  if (!response.ok) throw new Error("Error al crear categoría")
  const result = await response.json()
  return result.success ? result.data : result
}

export const updateFormCategory = async (id: string, categoryData: any) => {
  const response = await fetch(`${API_URL}categorias-formularios/${id}`, {
    method: "PUT",
    headers: getHeadersWithContentType(),
    body: JSON.stringify(categoryData),
  })
  if (!response.ok) throw new Error("Error al actualizar categoría")
  const result = await response.json()
  return result.success ? result.data : result
}

export const deleteFormCategory = async (id: string) => {
  const response = await fetch(`${API_URL}categorias-formularios/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  })

  if (!response.ok) throw new Error("Error al eliminar categoría")

  const result = await response.json()
  return result.success ? result.data : result
}
