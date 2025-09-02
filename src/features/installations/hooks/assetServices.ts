import { useAuthStore } from "../../../store/authStore";
import { getAuthHeaders, getHeadersWithContentType } from "../../../shared/utils/apiHeaders";

const API_URL = import.meta.env.VITE_API_URL;

const getToken = () => {
  return useAuthStore.getState().token;
};

export const fetchAssets = async (): Promise<any[]> => {
  try {
    const response = await fetch(`${API_URL}activos`, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error en fetchAssets:", error);
    throw error;
  }
};

export const createAsset = async (assetData: any) => {
  try {
    const response = await fetch(`${API_URL}activos`, {
      method: "POST",
      headers: getHeadersWithContentType(),
      body: JSON.stringify(assetData),
    });
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error en createAsset:", error);
    throw error;
  }
};

export const updateAsset = async (id: string, assetData: any) => {
  try {
    const response = await fetch(`${API_URL}activos/${id}`, {
      method: "PUT",
      headers: getHeadersWithContentType(),
      body: JSON.stringify(assetData),
    });
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error en updateAsset:", error);
    throw error;
  }
};

export const deleteAsset = async (id: string) => {
  try {
    const response = await fetch(`${API_URL}activos/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error en deleteAsset:", error);
    throw error;
  }
};