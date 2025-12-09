import { useAuthStore } from "../../../store/authStore";
import { getAuthHeaders, getHeadersWithContentType } from "../../../shared/utils/apiHeaders";

const API_URL = import.meta.env.VITE_API_URL;

const getToken = () => {
  return useAuthStore.getState().token;
};

export const fetchInstallations = async (): Promise<any[]> => {
  const response = await fetch(`${API_URL}installations`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Error al obtener instalaciones");
  return await response.json();
};

export const fetchInstallationById = async (id: string): Promise<any> => {
  const response = await fetch(`${API_URL}installations/${id}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Error al obtener instalación");
  const result = await response.json();
  return result.success ? result.data : result;
};

export const fetchInstallationDevices = async (installationId: string): Promise<any[]> => {
  const response = await fetch(`${API_URL}installations/${installationId}/dispositivos`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Error al obtener dispositivos");
  const result = await response.json();
  return result.success ? result.data : result;
};

export const fetchAssets = async (): Promise<any[]> => {
  const response = await fetch(`${API_URL}activos`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Error al obtener activos");
  const result = await response.json();
  return Array.isArray(result) ? result : [];
};

export const createInstallation = async (installation: any) => {
  console.log('📤 [CREATE INSTALLATION] Enviando datos:', JSON.stringify(installation, null, 2));
  
  const response = await fetch(`${API_URL}installations`, {
    method: "POST",
    headers: getHeadersWithContentType(),
    body: JSON.stringify(installation),
  });
  
  console.log('📥 [CREATE INSTALLATION] Response status:', response.status);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.log('❌ [CREATE INSTALLATION] Error data:', errorData);
    throw new Error("Error al crear instalación");
  }
  
  const result = await response.json();
  console.log('✅ [CREATE INSTALLATION] Success:', result);
  return result.success ? result.data : result;
};

export const updateInstallation = async (id: string, installation: any) => {
  const { _id, image, ...rest } = installation;
  const updateData = {
    ...rest,
    ...(typeof image === "string" ? { image } : {}),
  };
  const response = await fetch(`${API_URL}installations/${id}`, {
    method: "PUT",
    headers: getHeadersWithContentType(),
    body: JSON.stringify(updateData),
  });
  if (!response.ok) throw new Error("Error al actualizar instalación");
  const result = await response.json();
  return result.success ? result.data : result;
};

export const deleteInstallation = async (id: string) => {
  const response = await fetch(`${API_URL}installations/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Error al eliminar instalación");
  return await response.json();
};

export const addDeviceToInstallation = async (installationId: string, deviceData: any) => {
  console.log('\n🚀 [ADD DEVICE] ==================== INICIO ====================');
  
  const headers = getHeadersWithContentType();
  console.log('\n🔐 [ADD DEVICE] Headers después de getHeadersWithContentType():', headers);
  console.log('🔐 [ADD DEVICE] Headers es un objeto?:', typeof headers === 'object');
  console.log('🔐 [ADD DEVICE] Headers tiene Authorization?:', 'Authorization' in headers);
  console.log('🔐 [ADD DEVICE] Token en store:', useAuthStore.getState().token);
  console.log('🔐 [ADD DEVICE] TenantId en store:', useAuthStore.getState().tenantId);
  console.log('📤 [ADD DEVICE] Datos del dispositivo:', deviceData);
  
  const url = `${API_URL}installations/${installationId}/dispositivos`;
  console.log('🌐 [ADD DEVICE] URL completa:', url);
  
  const fetchOptions = {
    method: "POST",
    headers: headers,
    body: JSON.stringify(deviceData),
  };
  
  console.log('📦 [ADD DEVICE] Opciones de fetch COMPLETAS:');
  console.log(JSON.stringify(fetchOptions, null, 2));
  console.log('\n🌐 [ADD DEVICE] Enviando request...');
  
  const response = await fetch(url, fetchOptions);
  
  console.log('\n📥 [ADD DEVICE] Response recibida:');
  console.log('📥 [ADD DEVICE] Response status:', response.status);
  console.log('📥 [ADD DEVICE] Response statusText:', response.statusText);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('\n❌ [ADD DEVICE] Error data:', errorData);
    console.error('❌ [ADD DEVICE] ==================== FIN CON ERROR ====================\n');
    throw new Error("Error al agregar dispositivo");
  }
  
  const result = await response.json();
  console.log('\n✅ [ADD DEVICE] Success:', result);
  console.log('✅ [ADD DEVICE] ==================== FIN EXITOSO ====================\n');
  return result.success ? result.data : result;
};

export const deleteDeviceFromInstallation = async (installationId: string, deviceId: string) => {
  const response = await fetch(`${API_URL}installations/${installationId}/dispositivos/${deviceId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Error al eliminar dispositivo");
  return await response.json();
};

export const updateDeviceInInstallation = async (
  installationId: string,
  deviceId: string,
  deviceData: any
) => {
  console.log('🔍 Enviando actualización de dispositivo:', { installationId, deviceId, deviceData });
  const response = await fetch(`${API_URL}installations/${installationId}/dispositivos/${deviceId}`, {
    method: "PUT",
    headers: getHeadersWithContentType(),
    body: JSON.stringify(deviceData),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
    console.error('❌ Error del servidor:', errorData);
    throw new Error(errorData.error || "Error al actualizar dispositivo");
  }
  
  const result = await response.json();
  console.log('✅ Dispositivo actualizado:', result);
  return result.success ? result.data : result;
};

export const assignTemplateToDevice = async (
  installationId: string,
  deviceId: string,
  templateId: string
) => {
  const response = await fetch(
    `${API_URL}installations/${installationId}/dispositivos/${deviceId}/plantilla`,
    {
      method: "PATCH",
      headers: getHeadersWithContentType(),
      body: JSON.stringify({ templateId }),
    }
  );
  if (!response.ok) throw new Error("Error al asignar plantilla al dispositivo");
  const result = await response.json();
  return result.success ? result.data : result;
};
