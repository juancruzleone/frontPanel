import { useAuthStore } from "../../../store/authStore";

const API_URL = import.meta.env.VITE_API_URL;

const getToken = () => {
  return useAuthStore.getState().token;
};

export const fetchFormTemplates = async () => {
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

export const fetchFormTemplateById = async (id: string) => {
  const token = getToken();

  const response = await fetch(`${API_URL}plantillas/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al obtener plantilla");
  }

  return await response.json();
};

export const fetchFormTemplatesByCategory = async (category: string) => {
  const token = getToken();

  const response = await fetch(`${API_URL}plantillas/categoria/${category}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al obtener plantillas por categoría");
  }

  return await response.json();
};

export const createFormTemplate = async (templateData: any) => {
  const token = getToken();

  const response = await fetch(`${API_URL}plantillas`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(templateData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al crear plantilla");
  }

  return await response.json();
};

export const updateFormTemplate = async (id: string, templateData: any) => {
  const token = getToken();

  const response = await fetch(`${API_URL}plantillas/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(templateData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al actualizar plantilla");
  }

  return await response.json();
};

export const deleteFormTemplate = async (id: string) => {
  const token = getToken();

  const response = await fetch(`${API_URL}plantillas/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al eliminar plantilla");
  }

  return await response.json();
};