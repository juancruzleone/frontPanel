import { Tenant, CreateTenantData, EditTenantData, TenantsResponse } from '../types/tenant.types'
import { fetchWithAuthRetry, getAuthHeaders } from '../../../shared/utils/apiHeaders'
import { getApiHeaders } from '../../../shared/utils/apiHeaders'
import { parseJsonResponse, throwApiError } from '@/shared/services/ApiError'
import type { AdministrativeTrialRequest, AdministrativeTrialResponse } from '../types/administrativeTrial.types'

const API_URL = import.meta.env.VITE_API_URL || '/api/'

export const tenantServices = {
  async getTenants(): Promise<Tenant[]> {
    const response = await fetch(`${API_URL}tenants`, {
      method: 'GET',
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error('Error al obtener tenants')
    }

    const data: TenantsResponse = await response.json()
    return data.tenants
  },

  async createTenant(tenantData: CreateTenantData): Promise<Tenant> {
    const response = await fetchWithAuthRetry(`${API_URL}tenants`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify(tenantData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Error al crear tenant')
    }

    const result = await response.json()
    return result.tenant
  },

  async updateTenant(tenantData: EditTenantData): Promise<Tenant> {
    const response = await fetchWithAuthRetry(`${API_URL}tenants/${tenantData._id}`, {
      method: 'PUT',
      headers: getAuthHeaders(true),
      body: JSON.stringify(tenantData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Error al actualizar tenant')
    }

    const result = await response.json()
    return result.tenant
  },

  async deleteTenant(tenantId: string): Promise<void> {
    const response = await fetchWithAuthRetry(`${API_URL}tenants/${tenantId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Error al eliminar tenant')
    }
  },

  async createAdministrativeTrial(request: AdministrativeTrialRequest): Promise<AdministrativeTrialResponse> {
    const response = await fetchWithAuthRetry(`${API_URL}cuenta/demo`, {
      method: 'POST',
      headers: getApiHeaders(true, 'POST'),
      body: JSON.stringify(request),
    })

    if (!response.ok) return throwApiError(response, 'No se pudo crear la cuenta de prueba')
    const result = await parseJsonResponse<AdministrativeTrialResponse>(response)
    if (!result?.success) throw new Error('La respuesta de creación de prueba no es válida')
    return result
  },
} 
