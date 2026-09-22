import { useEffect, useState, useCallback } from "react"
import { fetchTechnicians } from "../services/technicianServices"
import { useTechnicianStore } from "../../../store/technicianStore"
import { useAuthStore } from "../../../store/authStore"

export interface Technician {
  _id: string
  userName: string
  role: string
}

const useTechnicians = () => {
  const { technicians: storedTechnicians, setTechnicians, ownerId } = useTechnicianStore()
  const { userId } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const validTechnicians = userId && ownerId === userId ? storedTechnicians : []

  const loadTechnicians = useCallback(async () => {
    const currentStore = useTechnicianStore.getState()
    const hasValidCache = Boolean(userId && currentStore.ownerId === userId && currentStore.technicians.length > 0)
    try {
      setLoading(true)
      setError(null)
      if (!navigator.onLine && hasValidCache) {
        setLoading(false)
        return
      }
      const data = await fetchTechnicians()
      setTechnicians(data)
    } catch (err: unknown) {
      if (hasValidCache) {
        setLoading(false)
        return
      }
      setError((err as Error).message || "Error al cargar técnicos")
    } finally {
      setLoading(false)
    }
  }, [userId, setTechnicians])

  useEffect(() => {
    loadTechnicians()
  }, [loadTechnicians])

  return { technicians: validTechnicians, loading, error, reload: loadTechnicians }
}


export default useTechnicians
