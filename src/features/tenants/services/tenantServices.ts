import { Tenant, CreateTenantData, EditTenantData, TenantsResponse } from '../types/tenant.types'
import { getAuthHeaders } from '../../../shared/utils/apiHeaders'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:2023/api/'

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
    const response = await fetch(`${API_URL}tenants`, {
      method: 'POST',
      headers: getAuthHeaders(),
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
    const response = await fetch(`${API_URL}tenants/${tenantData._id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
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
    const response = await fetch(`${API_URL}tenants/${tenantId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Error al eliminar tenant')
    }
  },
} 