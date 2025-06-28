import { useAuthStore } from "../../../store/authStore";

const API_URL = import.meta.env.VITE_API_URL;

const getToken = () => {
  return useAuthStore.getState().token;
};

export const fetchInstallations = async (): Promise<any[]> => {
  const token = getToken();
  const response = await fetch(`${API_URL}installations`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error("Error al obtener instalaciones");
  return await response.json();
};

export const fetchInstallationById = async (id: string): Promise<any> => {
  const token = getToken();
  const response = await fetch(`${API_URL}installations/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error("Error al obtener instalación");
  const result = await response.json();
  return result.success ? result.data : result;
};

export const fetchInstallationDevices = async (installationId: string): Promise<any[]> => {
  const token = getToken();
  const response = await fetch(`${API_URL}installations/${installationId}/dispositivos`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error("Error al obtener dispositivos");
  const result = await response.json();
  return result.success ? result.data : result;
};

export const fetchAssets = async (): Promise<any[]> => {
  const token = getToken();
  const response = await fetch(`${API_URL}activos`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error("Error al obtener activos");
  const result = await response.json();
  return Array.isArray(result) ? result : [];
};

export const createInstallation = async (installation: any) => {
  const token = getToken();
  const response = await fetch(`${API_URL}installations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(installation),
  });
  if (!response.ok) throw new Error("Error al crear instalación");
  const result = await response.json();
  return result.success ? result.data : result;
};

export const updateInstallation = async (id: string, installation: any) => {
  const token = getToken();
  const { _id, image, ...rest } = installation;
  const updateData = {
    ...rest,
    ...(typeof image === "string" ? { image } : {}),
  };
  const response = await fetch(`${API_URL}installations/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updateData),
  });
  if (!response.ok) throw new Error("Error al actualizar instalación");
  const result = await response.json();
  return result.success ? result.data : result;
};

export const deleteInstallation = async (id: string) => {
  const token = getToken();
  const response = await fetch(`${API_URL}installations/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error("Error al eliminar instalación");
  return await response.json();
};

export const addDeviceToInstallation = async (installationId: string, deviceData: any) => {
  const token = getToken();
  const response = await fetch(`${API_URL}installations/${installationId}/activos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      assetId: deviceData.assetId,
      ubicacion: deviceData.ubicacion,
      categoria: deviceData.categoria,
    }),
  });
  if (!response.ok) throw new Error("Error al agregar dispositivo");
  const result = await response.json();
  return result.success ? result.data : result;
};

export const deleteDeviceFromInstallation = async (installationId: string, deviceId: string) => {
  const token = getToken();
  const response = await fetch(`${API_URL}installations/${installationId}/dispositivos/${deviceId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error("Error al eliminar dispositivo");
  return await response.json();
};

export const updateDeviceInInstallation = async (
  installationId: string,
  deviceId: string,
  deviceData: any
) => {
  const token = getToken();
  const response = await fetch(`${API_URL}installations/${installationId}/dispositivos/${deviceId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(deviceData),
  });
  if (!response.ok) throw new Error("Error al actualizar dispositivo");
  const result = await response.json();
  return result.success ? result.data : result;
};

export const assignTemplateToDevice = async (
  installationId: string,
  deviceId: string,
  templateId: string
) => {
  const token = getToken();
  const response = await fetch(
    `${API_URL}installations/${installationId}/dispositivos/${deviceId}/plantilla`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ templateId }),
    }
  );
  if (!response.ok) throw new Error("Error al asignar plantilla al dispositivo");
  const result = await response.json();
  return result.success ? result.data : result;
};
