import { useState, useCallback } from 'react'
import { Tenant, CreateTenantData, EditTenantData } from '../types/tenant.types'
import { tenantServices } from '../services/tenantServices'

export const useTenants = () => {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadTenants = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await tenantServices.getTenants()
      setTenants(data)
    } catch (err: any) {
      setError(err.message || 'Error al cargar tenants')
      console.error('Error loading tenants:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const addTenant = useCallback(async (tenantData: CreateTenantData) => {
    try {
      const newTenant = await tenantServices.createTenant(tenantData)
      setTenants(prev => [...prev, newTenant])
      return newTenant
    } catch (err: any) {
      throw new Error(err.message || 'Error al crear tenant')
    }
  }, [])

  const editTenant = useCallback(async (tenantData: EditTenantData) => {
    try {
      const updatedTenant = await tenantServices.updateTenant(tenantData)
      setTenants(prev => prev.map(tenant => 
        tenant._id === tenantData._id ? updatedTenant : tenant
      ))
      return updatedTenant
    } catch (err: any) {
      throw new Error(err.message || 'Error al actualizar tenant')
    }
  }, [])

  const removeTenant = useCallback(async (tenantId: string) => {
    try {
      await tenantServices.deleteTenant(tenantId)
      setTenants(prev => prev.filter(tenant => tenant._id !== tenantId))
    } catch (err: any) {
      throw new Error(err.message || 'Error al eliminar tenant')
    }
  }, [])

  return {
    tenants,
    loading,
    error,
    loadTenants,
    addTenant,
    editTenant,
    removeTenant,
  }
}

export default useTenants 