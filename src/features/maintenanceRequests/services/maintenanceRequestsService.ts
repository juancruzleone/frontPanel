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
  // Usar la ruta correcta para clientes
  private baseUrl = `${API_URL}solicitar-mantenimiento`
  private ordersUrl = `${API_URL}mis-ordenes-trabajo`

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
    
    // Usar la ruta de órdenes de trabajo para clientes
    const response = await fetch(`${this.ordersUrl}?${params.toString()}`, {
      headers: getAuthHeaders()
    })
    const result = await handleResponse(response)
    
    // El backend devuelve directamente un array de órdenes de trabajo
    const orders = Array.isArray(result) ? result : []
    
    return {
      requests: orders,
      total: orders.length
    }
  }

  async getRequestById(id: string): Promise<MaintenanceRequest> {
    const response = await fetch(`${this.ordersUrl}/${id}`, {
      headers: getAuthHeaders()
    })
    return handleResponse(response)
  }

  async cancelRequest(id: string, motivo?: string): Promise<{ message: string }> {
    // Esta funcionalidad puede no estar disponible para clientes
    // Verificar con el backend si existe una ruta para cancelar
    throw new Error("Funcionalidad no disponible. Contacte al administrador para cancelar la solicitud.")
  }
}

export const maintenanceRequestsService = new MaintenanceRequestsService()
