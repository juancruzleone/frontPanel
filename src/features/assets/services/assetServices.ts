import { useAuthStore } from "../../../store/authStore";

const API_URL = import.meta.env.VITE_API_URL;

const getToken = () => {
  return useAuthStore.getState().token;
};

export const fetchAssets = async (): Promise<any[]> => {
  const token = getToken();

  const response = await fetch(`${API_URL}activos`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al obtener activos");
  }

  return await response.json();
};

export const fetchTemplates = async (): Promise<any[]> => {
  const token = getToken();

  const response = await fetch(`${API_URL}plantillas`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al obtener plantillas");
  }

  return await response.json();
};

export const createAsset = async (asset: any) => {
  const token = getToken();

  const response = await fetch(`${API_URL}activos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(asset),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al crear activo");
  }

  return await response.json();
};

export const updateAsset = async (id: string, asset: any) => {
  const token = getToken();

  const { _id, ...rest } = asset;

  const response = await fetch(`${API_URL}activos/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(rest),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al actualizar activo");
  }

  return await response.json();
};

export const deleteAsset = async (id: string) => {
  const token = getToken();

  const response = await fetch(`${API_URL}activos/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al eliminar activo");
  }

  return await response.json();
};

export const assignTemplateToAsset = async (assetId: string, templateId: string) => {
  const token = getToken();

  const response = await fetch(`${API_URL}activos/${assetId}/plantilla`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ templateId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al asignar plantilla al activo");
  }

  return await response.json();
};