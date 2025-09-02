import { useAuthStore } from "../../../store/authStore";
import { getAuthHeaders, getHeadersWithContentType } from "../../../shared/utils/apiHeaders";

const API_URL = import.meta.env.VITE_API_URL;

const getToken = () => {
  return useAuthStore.getState().token;
};

export const fetchCategories = async (includeInactive = false): Promise<any[]> => {
  const response = await fetch(`${API_URL}categorias?includeInactive=${includeInactive}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Error al obtener categorías");
  return await response.json();
};

export const createCategory = async (categoryData: any) => {
  const response = await fetch(`${API_URL}categorias`, {
    method: "POST",
    headers: getHeadersWithContentType(),
    body: JSON.stringify(categoryData),
  });
  if (!response.ok) throw new Error("Error al crear categoría");
  return await response.json();
};