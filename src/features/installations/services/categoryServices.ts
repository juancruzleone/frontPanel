import { getAuthHeaders, getHeadersWithContentType, fetchWithCsrf } from "../../../shared/utils/apiHeaders";

const API_URL = import.meta.env.VITE_API_URL;

export interface CategoryResponse {
  _id: string;
  nombre: string;
  descripcion?: string;
  activa?: boolean;
  fechaCreacion: string;
}

export const fetchCategories = async (includeInactive = false): Promise<CategoryResponse[]> => {
  const response = await fetchWithCsrf(`${API_URL}categorias?includeInactive=${includeInactive}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Error al obtener categorías");
  return await response.json();
};

export const createCategory = async (categoryData: Record<string, unknown>) => {
  const response = await fetchWithCsrf(`${API_URL}categorias`, {
    method: "POST",
    headers: getHeadersWithContentType(),
    body: JSON.stringify(categoryData),
  });
  if (!response.ok) throw new Error("Error al crear categoría");
  return await response.json();
};

export const updateCategory = async (id: string, categoryData: Record<string, unknown>) => {
  const response = await fetchWithCsrf(`${API_URL}categorias/${id}`, {
    method: "PUT",
    headers: getHeadersWithContentType(),
    body: JSON.stringify(categoryData),
  });
  if (!response.ok) throw new Error("Error al actualizar categoría");
  return await response.json();
};

export const deleteCategory = async (id: string) => {
  const response = await fetchWithCsrf(`${API_URL}categorias/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Error al eliminar categoría");
  return await response.json();
};
