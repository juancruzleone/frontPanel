import { useState, useCallback } from "react"
import { userRegister, getTechnicians } from "../services/registerServices"
import { useAuthStore } from "../../../../../src/store/authStore.ts"

interface Technician {
  _id?: string
  id?: string
  userName: string
  role: string
  createdAt: string
  status?: string
}

export function useRegister() {
  const [showModal, setShowModal] = useState(false)
  const [responseMessage, setResponseMessage] = useState("")
  const [isError, setIsError] = useState(false)
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [loadingTechnicians, setLoadingTechnicians] = useState(true)

  const token = useAuthStore((state) => state.token)

  const fetchTechnicians = useCallback(async () => {
    if (!token) return

    setLoadingTechnicians(true)
    try {
      const data = await getTechnicians(token)
      setTechnicians(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error al obtener técnicos:", error)
      setTechnicians([])
    } finally {
      setLoadingTechnicians(false)
    }
  }, [token])

  const addTechnician = useCallback(
    async (username: string, password: string): Promise<{ message: string }> => {
      if (!token) {
        throw new Error("No tienes permisos para registrar usuarios")
      }

      try {
        const response = await userRegister(username, password, token)
        const message = response?.message || "Técnico registrado exitosamente."

        // Actualizar lista de técnicos
        await fetchTechnicians()

        // Mostrar modal de éxito
        setResponseMessage(message)
        setIsError(false)
        setShowModal(true)

        return { message }
      } catch (err: any) {
        setResponseMessage(err.message || "Error al registrar técnico")
        setIsError(true)
        setShowModal(true)
        throw new Error(err.message)
      }
    },
    [token, fetchTechnicians],
  )

  const closeModal = useCallback(() => {
    setShowModal(false)
    setResponseMessage("")
    setIsError(false)
  }, [])

  return {
    showModal,
    responseMessage,
    isError,
    closeModal,
    technicians,
    loadingTechnicians,
    fetchTechnicians,
    addTechnician,
  }
}
