import { useAuthStore } from "../../../store/authStore";
import { fetchWithAuthRetry, getAuthHeaders, getHeadersWithContentType } from "../../../shared/utils/apiHeaders";

const API_URL = import.meta.env.VITE_API_URL || "/api/";

const getToken = () => {
  return useAuthStore.getState().token;
};

export const fetchManuals = async (params: { page?: number, limit?: number, search?: string, assetId?: string, categoria?: string } = {}): Promise<any> => {
  const queryParams = new URLSearchParams()
  if (params.page) queryParams.append('page', params.page.toString())
  if (params.limit) queryParams.append('limit', params.limit.toString())
  if (params.search) queryParams.append('search', params.search)
  if (params.assetId) queryParams.append('assetId', params.assetId)
  if (params.categoria) queryParams.append('categoria', params.categoria)

  const response = await fetch(`${API_URL}manuales?${queryParams.toString()}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al obtener manuales");
  }

  return await response.json();
};

export const fetchManualById = async (id: string): Promise<any> => {
  const response = await fetch(`${API_URL}manuales/${id}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al obtener manual");
  }

  return await response.json();
};

export const fetchManualsByAssetId = async (assetId: string): Promise<any[]> => {
  const response = await fetch(`${API_URL}activos/${assetId}/manuales`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al obtener manuales del activo");
  }

  return await response.json();
};

export const createManual = async (manualData: any): Promise<any> => {
  const formData = new FormData();
  Object.entries(manualData).forEach(([key, value]) => {
    if (key === 'tags' && Array.isArray(value)) {
      formData.append(key, value.join(','));
    } else if (value !== undefined && value !== null) {
      formData.append(key, value as string | Blob);
    }
  });

  const response = await fetchWithAuthRetry(`${API_URL}manuales`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al crear manual");
  }

  return await response.json();
};

export const updateManual = async (id: string, manualData: any): Promise<any> => {
  const formData = new FormData();
  Object.entries(manualData).forEach(([key, value]) => {
    if (key === 'tags' && Array.isArray(value)) {
      formData.append(key, value.join(','));
    } else if (value !== undefined && value !== null) {
      formData.append(key, value as string | Blob);
    }
  });

  const response = await fetchWithAuthRetry(`${API_URL}manuales/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al actualizar manual");
  }

  return await response.json();
};

export const patchManual = async (id: string, manualData: any): Promise<any> => {
  const response = await fetchWithAuthRetry(`${API_URL}manuales/${id}`, {
    method: "PATCH",
    headers: getHeadersWithContentType(),
    body: JSON.stringify(manualData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al actualizar manual parcialmente");
  }

  return await response.json();
};

export const deleteManual = async (id: string): Promise<void> => {
  const response = await fetchWithAuthRetry(`${API_URL}manuales/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al eliminar manual");
  }
};

export const updateManualFile = async (id: string, file: File): Promise<any> => {
  const formData = new FormData();
  formData.append('archivo', file);

  const response = await fetchWithAuthRetry(`${API_URL}manuales/${id}/archivo`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al actualizar archivo del manual");
  }

  return await response.json();
};
