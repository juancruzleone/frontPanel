import { useState, useCallback } from 'react'
import { maintenanceRequestsService, MaintenanceRequest, CreateMaintenanceRequestData } from '../services/maintenanceRequestsService'

export function useMaintenanceRequests() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRequests = useCallback(async (filters?: { estado?: string; instalacionId?: string }) => {
    setLoading(true)
    setError(null)
    try {
      const data = await maintenanceRequestsService.getRequests(filters)
      setRequests(data.requests)
      return data
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Error al cargar las solicitudes'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const createRequest = useCallback(async (data: CreateMaintenanceRequestData) => {
    setLoading(true)
    setError(null)
    try {
      const result = await maintenanceRequestsService.createRequest(data)
      await fetchRequests() // Recargar lista
      return result
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Error al crear la solicitud'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [fetchRequests])

  const cancelRequest = useCallback(async (id: string, motivo?: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await maintenanceRequestsService.cancelRequest(id, motivo)
      await fetchRequests() // Recargar lista
      return result
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Error al cancelar la solicitud'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [fetchRequests])

  return {
    requests,
    loading,
    error,
    fetchRequests,
    createRequest,
    cancelRequest
  }
}
