import { useAuthStore } from '../../../store/authStore'
import { getAuthHeaders, getHeadersWithContentType } from '../../../shared/utils/apiHeaders'

const API_URL = import.meta.env.VITE_API_URL

export interface MaintenanceRequest {
  _id?: string
  titulo: string
  descripcion: string
  instalacionId: string
  dispositivoId?: string | null
  prioridad: 'baja' | 'media' | 'alta'
  tipoProblema: 'falla_equipo' | 'mantenimiento_preventivo' | 'revision_general' | 'actualizacion' | 'otro'
  fechaPreferida?: string | null
  horaPreferida?: string | null
  contactoNombre: string
  contactoTelefono: string
  contactoEmail: string
  observaciones?: string
  estado?: string
  fechaCreacion?: string
  instalacion?: {
    company: string
    address: string
    city: string
  }
  dispositivo?: {
    nombre: string
    ubicacion: string
    categoria: string
  }
}

export interface CreateMaintenanceRequestData {
  titulo: string
  descripcion: string
  instalacionId: string
  dispositivoId?: string | null
  prioridad: 'baja' | 'media' | 'alta'
  tipoProblema: string
  fechaPreferida?: string | null
  horaPreferida?: string | null
  contactoNombre: string
  contactoTelefono: string
  contactoEmail: string
  observaciones?: string
}

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    let error;
    try {
      error = await response.json();
    } catch (e) {
      error = { message: "Error de conexión", details: await response.text() };
    }

    let errorMsg = error.message || error.error;
    if (!errorMsg && error.code) errorMsg = error.code;

    if (error.details && Array.isArray(error.details) && error.details.length > 0) {
      errorMsg = `${errorMsg ? errorMsg + ': ' : ''}${error.details.join(', ')}`;
    }

    throw new Error(errorMsg || `Error ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

class MaintenanceRequestsService {
  private baseUrl = `${API_URL}maintenance-requests`

  async createRequest(data: CreateMaintenanceRequestData): Promise<{ message: string; workOrder: MaintenanceRequest }> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: getHeadersWithContentType(),
      body: JSON.stringify(data)
    })
    return handleResponse(response)
  }

  async getRequests(filters?: { estado?: string; instalacionId?: string }): Promise<{ requests: MaintenanceRequest[]; total: number }> {
    const params = new URLSearchParams()
    if (filters?.estado) params.append('estado', filters.estado)
    if (filters?.instalacionId) params.append('instalacionId', filters.instalacionId)
    
    const response = await fetch(`${this.baseUrl}?${params.toString()}`, {
      headers: getAuthHeaders()
    })
    return handleResponse(response)
  }

  async getRequestById(id: string): Promise<MaintenanceRequest> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      headers: getAuthHeaders()
    })
    return handleResponse(response)
  }

  async cancelRequest(id: string, motivo?: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/${id}/cancel`, {
      method: 'PATCH',
      headers: getHeadersWithContentType(),
      body: JSON.stringify({ motivo })
    })
    return handleResponse(response)
  }
}

export const maintenanceRequestsService = new MaintenanceRequestsService()
