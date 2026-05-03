import { useAuthStore } from "../../../store/authStore";
import { getAuthHeaders, getHeadersWithContentType, fetchWithCsrf } from "../../../shared/utils/apiHeaders";

const API_URL = import.meta.env.VITE_API_URL || "/api/";

export interface InstallationDeviceResponse {
  _id?: string;
  assetId: string;
  nombre: string;
  ubicacion: string;
  categoria: string;
  templateId?: string;
  estado: string;
  marca?: string;
  modelo?: string;
  numeroSerie?: string;
  cantidad?: number;
  codigoQR?: string;
}

export interface InstallationResponse {
  _id?: string;
  company: string;
  address: string;
  floorSector?: string;
  postalCode?: string;
  city?: string;
  province?: string;
  installationType: string;
  image?: File | null | string;
  devices?: InstallationDeviceResponse[];
  frecuencia?: string;
  fechaInicio?: string | Date;
  fechaFin?: string | Date;
  estado?: 'active' | 'inactive' | 'pending';
  fechaCreacion?: string | Date;
  fechaActualizacion?: string | Date;
  mesesFrecuencia?: string[];
}

export interface InstallationsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedInstallationsResponse {
  success: boolean;
  data: InstallationResponse[];
  pagination: InstallationsPagination;
}

export interface AssetResponse {
  _id: string;
  nombre: string;
  marca?: string;
  modelo?: string;
  numeroSerie?: string;
  estado: string;
  fechaCreacion: string;
}

// Helper para determinar si el usuario es cliente
const isClientUser = () => {
  const role = useAuthStore.getState().role;
  return role === 'cliente' || role === 'client';
};

// Helper para obtener la ruta correcta según el rol
const getInstallationsEndpoint = () => {
  return isClientUser() ? 'mis-instalaciones' : 'installations';
};

export const fetchInstallations = async (params: { page?: number, limit?: number, search?: string, category?: string } = {}): Promise<PaginatedInstallationsResponse> => {
  const queryParams = new URLSearchParams()
  if (params.page) queryParams.append('page', params.page.toString())
  if (params.limit) queryParams.append('limit', params.limit.toString())
  if (params.search) queryParams.append('search', params.search)
  if (params.category) queryParams.append('category', params.category)

  const endpoint = getInstallationsEndpoint();
  const response = await fetchWithCsrf(`${API_URL}${endpoint}?${queryParams.toString()}`, {
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) throw new Error("Error al obtener instalaciones");
  
  const result = await response.json();

  // Si es cliente, el endpoint devuelve un array simple sin paginación
  if (isClientUser() && Array.isArray(result)) {
    // Aplicar filtros manualmente en el cliente
      let filteredData = result as InstallationResponse[];
    
    // Filtrar por búsqueda
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filteredData = filteredData.filter((inst: { company?: string, address?: string, city?: string }) => 
        inst.company?.toLowerCase().includes(searchLower) ||
        inst.address?.toLowerCase().includes(searchLower) ||
        inst.city?.toLowerCase().includes(searchLower)
      );
    }
    
    // Filtrar por categoría
    if (params.category) {
      filteredData = filteredData.filter((inst: { installationType?: string }) => 
        inst.installationType === params.category
      );
    }
    
    // Implementar paginación manual
    const page = params.page || 1;
    const limit = params.limit || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = filteredData.slice(startIndex, endIndex);
    
    return {
      success: true,
      data: paginatedData,
      pagination: {
        page,
        limit,
        total: filteredData.length,
        totalPages: Math.ceil(filteredData.length / limit)
      }
    };
  }

  // Si viene con el nuevo formato de paginación (admin/técnico)
  if (result.success && result.pagination) {
    return result;
  }

  // Formato anterior (array simple) - convertir a formato con paginación
  if (Array.isArray(result)) {
    return {
      success: true,
      data: result,
      pagination: {
        page: 1,
        limit: result.length,
        total: result.length,
        totalPages: 1
      }
    };
  }

  return result;
};

export const fetchInstallationById = async (id: string): Promise<InstallationResponse> => {
  const endpoint = getInstallationsEndpoint();
  const response = await fetchWithCsrf(`${API_URL}${endpoint}/${id}`, {
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  if (!response.ok) throw new Error("Error al obtener instalación");
  const result = await response.json();
  return result.success ? result.data : result;
};

export const fetchInstallationDevices = async (installationId: string): Promise<InstallationDeviceResponse[]> => {
  const endpoint = getInstallationsEndpoint();
  const response = await fetchWithCsrf(`${API_URL}${endpoint}/${installationId}/dispositivos`, {
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  if (!response.ok) throw new Error("Error al obtener dispositivos");
  const result = await response.json();
  return result.success ? result.data : result;
};

export const fetchAssets = async (): Promise<AssetResponse[]> => {
  const response = await fetchWithCsrf(`${API_URL}activos`, {
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  if (!response.ok) throw new Error("Error al obtener activos");
  const result = await response.json();
  
  // La API devuelve: {assets: Array, total: number, totalPages: number}
  if (result.assets && Array.isArray(result.assets)) {
    return result.assets;
  }
  // Formato alternativo con success
  if (result.success && Array.isArray(result.data)) {
    return result.data;
  }
  // Fallback para array directo
  return Array.isArray(result) ? result : [];
};

export const createInstallation = async (installation: Record<string, unknown>): Promise<InstallationResponse> => {
  // Solo admin puede crear instalaciones
  if (isClientUser()) {
    throw new Error("No tienes permisos para crear instalaciones");
  }

  const response = await fetchWithCsrf(`${API_URL}installations`, {
    method: "POST",
    headers: getHeadersWithContentType(),
    body: JSON.stringify(installation),
    credentials: 'include',
  });



  if (!response.ok) {
    throw new Error("Error al crear instalación");
  }

  const result = await response.json();

  return result.success ? result.data : result;
};

export const updateInstallation = async (id: string, installation: { _id?: string, image?: File | null | string } & Record<string, unknown>): Promise<InstallationResponse> => {
  // Solo admin puede actualizar instalaciones
  if (isClientUser()) {
    throw new Error("No tienes permisos para actualizar instalaciones");
  }

  const { _id: _, image, ...rest } = installation;
  const updateData = {
    ...rest,
    ...(typeof image === "string" ? { image } : {}),
  };
  const response = await fetchWithCsrf(`${API_URL}installations/${id}`, {
    method: "PUT",
    headers: getHeadersWithContentType(),
    body: JSON.stringify(updateData),
    credentials: 'include',
  });
  if (!response.ok) throw new Error("Error al actualizar instalación");
  const result = await response.json();
  return result.success ? result.data : result;
};

export const deleteInstallation = async (id: string) => {
  // Solo admin puede eliminar instalaciones
  if (isClientUser()) {
    throw new Error("No tienes permisos para eliminar instalaciones");
  }

  const response = await fetchWithCsrf(`${API_URL}installations/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  if (!response.ok) throw new Error("Error al eliminar instalación");
  return await response.json();
};

export const addDeviceToInstallation = async (installationId: string, deviceData: Record<string, unknown>) => {
  // Solo admin puede agregar dispositivos
  if (isClientUser()) {
    throw new Error("No tienes permisos para agregar dispositivos");
  }

  const headers = getHeadersWithContentType();

  const url = `${API_URL}installations/${installationId}/dispositivos`;

  const fetchOptions = {
    method: "POST",
    headers: headers,
    body: JSON.stringify(deviceData),
    credentials: 'include' as RequestCredentials,
  };

  const response = await fetchWithCsrf(url, fetchOptions);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.message || errorData.error || "Error al agregar dispositivo";
    throw new Error(errorMessage);
  }

  const result = await response.json();


  return result.success ? result.data : result;
};

export const deleteDeviceFromInstallation = async (installationId: string, deviceId: string) => {
  // Solo admin puede eliminar dispositivos
  if (isClientUser()) {
    throw new Error("No tienes permisos para eliminar dispositivos");
  }

  const response = await fetchWithCsrf(`${API_URL}installations/${installationId}/dispositivos/${deviceId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  if (!response.ok) throw new Error("Error al eliminar dispositivo");
  return await response.json();
};

export const updateDeviceInInstallation = async (
  installationId: string,
  deviceId: string,
  deviceData: Record<string, unknown>
) => {
  // Solo admin puede actualizar dispositivos
  if (isClientUser()) {
    throw new Error("No tienes permisos para actualizar dispositivos");
  }

  const response = await fetchWithCsrf(`${API_URL}installations/${installationId}/dispositivos/${deviceId}`, {
    method: "PUT",
    headers: getHeadersWithContentType(),
    body: JSON.stringify(deviceData),
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(errorData.error || "Error al actualizar dispositivo");
  }

  const result = await response.json();

  return result.success ? result.data : result;
};

export const assignTemplateToDevice = async (
  installationId: string,
  deviceId: string,
  templateId: string
) => {
  // Solo admin puede asignar plantillas
  if (isClientUser()) {
    throw new Error("No tienes permisos para asignar plantillas");
  }

  const response = await fetchWithCsrf(
    `${API_URL}installations/${installationId}/dispositivos/${deviceId}/plantilla`,
    {
      method: "PATCH",
      headers: getHeadersWithContentType(),
      body: JSON.stringify({ templateId }),
      credentials: 'include',
    }
  );
  if (!response.ok) throw new Error("Error al asignar plantilla al dispositivo");
  const result = await response.json();
  return result.success ? result.data : result;
};
