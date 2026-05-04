import { useState, useCallback } from "react"
import { useSupplierStore } from "../../../store/supplierStore"
import type { Supplier } from "../../../store/supplierStore"
import { 
  fetchSuppliers, 
  createSupplier as apiCreateSupplier, 
  updateSupplier as apiUpdateSupplier,
  deleteSupplier as apiDeleteSupplier
} from "../services/supplierServices"

export const useSuppliers = () => {
  const { suppliers, total, loading, setSuppliers, setLoading } = useSupplierStore()
  const [error, setError] = useState<string | null>(null)

  const loadSuppliers = useCallback(async (params: { page?: number, limit?: number, name?: string } = {}) => {
    setLoading(true)
    try {
      const result = await fetchSuppliers(params)
      setSuppliers(result.suppliers || [], result.total || 0)
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al obtener proveedores")
      setSuppliers([], 0)
    } finally {
      setLoading(false)
    }
  }, [setSuppliers, setLoading])

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
    suppliers,
    total,
    loading,
    error,
    loadSuppliers,
    addSupplier,
    updateSupplier,
    removeSupplier
  }
}
