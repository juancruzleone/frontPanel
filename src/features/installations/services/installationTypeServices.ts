import { useAuthStore } from "../../../store/authStore";

const API_URL = import.meta.env.VITE_API_URL;

const getToken = () => {
  return useAuthStore.getState().token;
};

export const fetchInstallationTypes = async (includeInactive = false): Promise<any[]> => {
  const token = getToken();
  const response = await fetch(`${API_URL}tipos-instalacion?includeInactive=${includeInactive}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error("Error al obtener tipos de instalación");
  return await response.json();
};

export const createInstallationType = async (typeData: any) => {
  const token = getToken();
  const response = await fetch(`${API_URL}tipos-instalacion`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(typeData),
  });
  if (!response.ok) throw new Error("Error al crear tipo de instalación");
  return await response.json();
};