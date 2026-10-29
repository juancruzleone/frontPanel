import { useAuthStore } from '../../../store/authStore'
import { getAuthHeaders, getHeadersWithContentType, fetchWithAuthRetry, fetchWithCsrf } from '../../../shared/utils/apiHeaders'
import { recordClientMaintenanceRequest, listClientMaintenanceCommands } from '../../../shared/offline/clientMaintenance'

const API_URL = import.meta.env.VITE_API_URL || "/api/"

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
  localStatus?: 'pending' | 'conflict'
  failureReason?: string | null
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
  tipoProblema: MaintenanceRequest['tipoProblema']
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
    const requestId = crypto.randomUUID()
    if (!navigator.onLine) return this.recordOffline(data, requestId)
    try {
      const response = await fetchWithCsrf(this.baseUrl, {
        method: 'POST',
        headers: { ...getHeadersWithContentType(), 'X-Idempotency-Key': requestId },
        body: JSON.stringify({ ...data, clientRequestId: requestId })
      })
      return handleResponse(response)
    } catch (error) {
      if (error instanceof TypeError) return this.recordOffline(data, requestId)
      throw error
    }
  }

  async getRequests(filters?: { estado?: string; instalacionId?: string }): Promise<{ requests: MaintenanceRequest[]; total: number }> {
    const params = new URLSearchParams()
    if (filters?.estado) params.append('estado', filters.estado)
    if (filters?.instalacionId) params.append('instalacionId', filters.instalacionId)
    
    // Usar la ruta de órdenes de trabajo para clientes
    const response = await fetchWithAuthRetry(`${this.ordersUrl}?${params.toString()}`, {
      headers: getAuthHeaders()
    })
    const result = await handleResponse(response)
    
    // El backend devuelve directamente un array de órdenes de trabajo
    const orders = Array.isArray(result) ? result : []
    const local = await this.getLocalRequests()
    
    return {
      requests: [...local, ...orders],
      total: local.length + orders.length
    }
  }

  async getRequestById(id: string): Promise<MaintenanceRequest> {
    const response = await fetchWithAuthRetry(`${this.ordersUrl}/${id}`, {
      headers: getAuthHeaders()
    })
    return handleResponse(response)
  }

  async cancelRequest(id: string, motivo?: string): Promise<{ message: string }> {
    // S4+S8: el cliente pide la cancelación contra la ruta propia. Solo se
    // prueba la ruta alternativa cuando la primera no existe (404/405 =
    // ruta no implementada). Cualquier otro rechazo (403, validación,
    // estado no cancelable) se informa directamente sin enmascararlo.
    // La ruta oficial está pendiente de confirmación del backend.
    const reason = motivo?.trim() || "Cancelación solicitada por el cliente";
    const attempts: Array<{ url: string; body: unknown }> = [
      { url: `${this.ordersUrl}/${id}/cancelar`, body: { motivo: reason } },
      { url: `${this.ordersUrl}/${id}/estado`, body: { estado: "cancelada", motivo: reason, observaciones: reason } },
    ];
    for (const attempt of attempts) {
      const response = await fetchWithCsrf(attempt.url, {
        method: "PATCH",
        body: JSON.stringify(attempt.body),
      });
      if (response.ok) {
        const result = (await handleResponse(response)) as { message?: string };
        return { message: result?.message || "Solicitud de cancelación enviada." };
      }
      if (response.status !== 404 && response.status !== 405) {
        await handleResponse(response);
      }
    }
    throw new Error("La cancelación en línea no está disponible. Contacte al administrador.");
  }

  private async recordOffline(data: CreateMaintenanceRequestData, requestId: string): Promise<{ message: string; workOrder: MaintenanceRequest }> {
    const result = await recordClientMaintenanceRequest({ ...data }, requestId)
    if (result.error) throw new Error(result.error)
    return {
      message: 'Solicitud guardada localmente y pendiente de sincronización.',
      workOrder: { ...data, _id: requestId, estado: 'solicitada', localStatus: 'pending' },
    }
  }

  private async getLocalRequests(): Promise<MaintenanceRequest[]> {
    const commands = await listClientMaintenanceCommands()
    return commands
      .filter(command => command.status !== 'succeeded')
      .map(command => ({
        ...(command.payload as unknown as CreateMaintenanceRequestData),
        _id: command.commandId,
        estado: command.status === 'conflict' || command.status === 'dead-letter' ? 'conflicto' : 'solicitada',
        localStatus: command.status === 'conflict' || command.status === 'dead-letter' ? 'conflict' : 'pending',
        failureReason: command.failureReason,
      }))
  }
}

export const maintenanceRequestsService = new MaintenanceRequestsService()
