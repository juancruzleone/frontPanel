import { useAuthStore } from "../../../store/authStore";

const API_URL = import.meta.env.VITE_API_URL;

const getToken = () => {
  return useAuthStore.getState().token;
};

export const fetchManuals = async (): Promise<any[]> => {
  const token = getToken();

  const response = await fetch(`${API_URL}manuales`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al obtener manuales");
  }

  return await response.json();
};

export const fetchManualById = async (id: string): Promise<any> => {
  const token = getToken();

  const response = await fetch(`${API_URL}manuales/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al obtener manual");
  }

  return await response.json();
};

export const fetchManualsByAssetId = async (assetId: string): Promise<any[]> => {
  const token = getToken();

  const response = await fetch(`${API_URL}activos/${assetId}/manuales`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al obtener manuales del activo");
  }

  return await response.json();
};

export const createManual = async (manualData: any): Promise<any> => {
  const token = getToken();

  const formData = new FormData();
  Object.entries(manualData).forEach(([key, value]) => {
    if (key === 'tags' && Array.isArray(value)) {
      formData.append(key, value.join(','));
    } else if (value !== undefined && value !== null) {
      formData.append(key, value as string | Blob);
    }
  });

  const response = await fetch(`${API_URL}manuales`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al crear manual");
  }

  return await response.json();
};

export const updateManual = async (id: string, manualData: any): Promise<any> => {
  const token = getToken();

  const formData = new FormData();
  Object.entries(manualData).forEach(([key, value]) => {
    if (key === 'tags' && Array.isArray(value)) {
      formData.append(key, value.join(','));
    } else if (value !== undefined && value !== null) {
      formData.append(key, value as string | Blob);
    }
  });

  const response = await fetch(`${API_URL}manuales/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al actualizar manual");
  }

  return await response.json();
};

export const patchManual = async (id: string, manualData: any): Promise<any> => {
  const token = getToken();

  const response = await fetch(`${API_URL}manuales/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(manualData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al actualizar manual parcialmente");
  }

  return await response.json();
};

export const deleteManual = async (id: string): Promise<void> => {
  const token = getToken();

  const response = await fetch(`${API_URL}manuales/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al eliminar manual");
  }
};

export const updateManualFile = async (id: string, file: File): Promise<any> => {
  const token = getToken();

  const formData = new FormData();
  formData.append('archivo', file);

  const response = await fetch(`${API_URL}manuales/${id}/archivo`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al actualizar archivo del manual");
  }

  return await response.json();
};