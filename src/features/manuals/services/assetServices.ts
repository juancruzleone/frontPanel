// src/features/manuals/services/assetServices.ts
import { useAuthStore } from "../../../store/authStore";

const API_URL = import.meta.env.VITE_API_URL;

const getToken = () => {
  return useAuthStore.getState().token;
};

export interface Asset {
  _id: string;
  nombre: string;
  marca: string;
  modelo: string;
  numeroSerie: string;
  categoria?: string;
  ubicacion?: string;
  estado: string;
  fechaCreacion: Date;
  fechaActualizacion?: Date;
}

export const fetchAssets = async (): Promise<Asset[]> => {
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

export const fetchAssetById = async (id: string): Promise<Asset> => {
  const token = getToken();

  const response = await fetch(`${API_URL}activos/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al obtener activo");
  }

  return await response.json();
};