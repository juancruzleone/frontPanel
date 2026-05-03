import { AuditLog, AuditLogsResponse } from '../types/audit.types'
import { getAuthHeaders } from '../../../shared/utils/apiHeaders'

const API_URL = import.meta.env.VITE_API_URL || '/api/'

/**
 * SERVICIO DE AUDITORÍA
 * 
 * NOTA: Este servicio está preparado para conectarse con un endpoint de auditoría.
 * El backend debe implementar el endpoint GET /api/audit-logs (o similar).
 */
export const auditService = {
  async getLogs(): Promise<AuditLogsResponse> {
    // Intentamos llamar al endpoint, pero manejamos si no existe
    try {
      const response = await fetch(`${API_URL}audit-logs`, {
        method: 'GET',
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('BACKEND_NOT_IMPLEMENTED')
        }
        throw new Error('Error al obtener registros de auditoría')
      }

      return await response.json()
    } catch (error: unknown) {
      console.error('Audit service error:', error)
      throw error
    }
  }
}
