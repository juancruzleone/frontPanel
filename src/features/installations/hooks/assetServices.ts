import { useAuthStore } from "../../../store/authStore";

const API_URL = import.meta.env.VITE_API_URL;

const getToken = () => {
  return useAuthStore.getState().token;
};

export const fetchAssets = async (): Promise<any[]> => {
  const token = getToken();
  try {
    const response = await fetch(`${API_URL}activos`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
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
  const token = getToken();
  try {
    const response = await fetch(`${API_URL}activos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
  const token = getToken();
  try {
    const response = await fetch(`${API_URL}activos/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
  const token = getToken();
  try {
    const response = await fetch(`${API_URL}activos/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
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