import { useState, useCallback } from "react"
import { useSupplierStore } from "../../../store/supplierStore"
import { useAuthStore } from "../../../store/authStore"
import type { Supplier } from "../../../store/supplierStore"
import { 
  fetchSuppliers, 
  createSupplier as apiCreateSupplier, 
  updateSupplier as apiUpdateSupplier, 
  deleteSupplier as apiDeleteSupplier
} from "../services/supplierServices"

export const useSuppliers = () => {
  const { suppliers, total, loading, setSuppliers, setLoading, ownerId } = useSupplierStore()
  const { userId } = useAuthStore()
  const [error, setError] = useState<string | null>(null)

  const validSuppliers = ownerId === userId ? suppliers : []

  const loadSuppliers = useCallback(async (params: { page?: number, limit?: number, name?: string } = {}) => {
    setLoading(true)
    try {
      if (!navigator.onLine && validSuppliers.length > 0) {
        setLoading(false)
        return
      }

      const result = await fetchSuppliers(params)
      setSuppliers(result.suppliers || [], result.total || 0)
      setError(null)
    } catch (err: unknown) {
      if (validSuppliers.length > 0) {
        setLoading(false)
        return
      }
      setError(err instanceof Error ? err.message : "Error al obtener proveedores")
    } finally {
      setLoading(false)
    }
  }, [setSuppliers, setLoading, validSuppliers.length])

  const addSupplier = async (supplier: Omit<Supplier, '_id'>) => {
    const newSupplier = await apiCreateSupplier(supplier)
    await loadSuppliers()
    return newSupplier
  }

  const updateSupplier = async (id: string, supplier: Partial<Omit<Supplier, '_id'>>) => {
    const updated = await apiUpdateSupplier(id, supplier)
    await loadSuppliers()
    return updated
  }

  const removeSupplier = async (id: string) => {
    await apiDeleteSupplier(id)
    await loadSuppliers()
  }

  return {
    suppliers: validSuppliers,
    total,
    loading,
    error,
    loadSuppliers,
    addSupplier,
    updateSupplier,
    removeSupplier
  }
}
