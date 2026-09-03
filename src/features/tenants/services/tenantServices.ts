import { Tenant, CreateTenantData, EditTenantData, TenantsResponse, TenantsPageResponse } from '../types/tenant.types'
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

  async getTenantsPage(page: number = 1, limit: number = 20, signal?: AbortSignal): Promise<TenantsPageResponse> {
    const url = `${API_URL}tenants?page=${page}&limit=${limit}`
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
      signal,
    })
    if (!response.ok) {
      const error: any = new Error(`Error al obtener tenants paginados: ${response.status}`)
      error.status = response.status
      throw error
    }
    const data: TenantsPageResponse = await response.json()
    return data
  },

  async fetchTenantsForAggregation(opts?: { pageSize?: number; maxPages?: number; signal?: AbortSignal }): Promise<{ tenants: Tenant[]; meta: { pages: number; total: number; truncated: boolean } }> {
    const pageSize = opts?.pageSize ?? 100
    const maxPages = opts?.maxPages ?? 25
    const signal = opts?.signal

    // fetch first page to detect envelope
    const first = await (tenantServices as any).getTenantsPage(1, pageSize, signal)
    // legacy envelope without totalPages -> single-shot
    if (typeof (first as any).totalPages !== 'number') {
      const tenants: Tenant[] = (first as any).tenants ?? []
      return { tenants, meta: { pages: 1, total: tenants.length, truncated: false } }
    }
    const total: number = (first.total as number) ?? (first as any).tenants.length
    const totalPages: number = (first.totalPages as number) ?? 1
    const pagesToFetch = Math.min(totalPages, maxPages)
    const truncated = totalPages > maxPages
    const all: Tenant[] = [...((first as any).tenants ?? [])]

    if (pagesToFetch > 1) {
      // bounded concurrency 3
      const concurrency = 3
      const queue: number[] = []
      for (let p = 2; p <= pagesToFetch; p++) queue.push(p)
      const results: Tenant[][] = []
      let idx = 0
      const run = async () => {
        while (idx < queue.length) {
          const page = queue[idx++]
          const data: TenantsPageResponse = await (tenantServices as any).getTenantsPage(page, pageSize, signal)
          results.push(data.tenants ?? [])
        }
      }
      const workers = Array.from({ length: Math.min(concurrency, queue.length) }, () => run())
      await Promise.all(workers)
      for (const chunk of results) all.push(...chunk)
    }

    // dedupe by _id
    const seen = new Set<string>()
    const deduped: Tenant[] = []
    for (const t of all) {
      if (!seen.has(t._id)) {
        seen.add(t._id)
        deduped.push(t)
      }
    }
    return { tenants: deduped, meta: { pages: pagesToFetch, total, truncated } }
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
