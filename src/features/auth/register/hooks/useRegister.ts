import { useState, useCallback, useEffect, useRef } from "react"
import { userRegister, getTechniciansPage } from "../services/registerServices"
import type { PageQuery, PaginationMetadata } from '../../../../shared/types/pagination'
import { useAuthStore } from "../../../../../src/store/authStore.ts"
import { useTranslation } from "react-i18next"

export interface Technician {
  _id?: string
  id?: string
  userName: string
  role: string
  createdAt: string
  status?: string
}

export function useRegister() {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false)
  const [responseMessage, setResponseMessage] = useState("")
  const [isError, setIsError] = useState(false)
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [loadingTechnicians, setLoadingTechnicians] = useState(true)

  const { isAuthenticated, userId, tenantId } = useAuthStore()
  const [query, setQuery] = useState<PageQuery>({ page: 1, limit: 10, search: '' })
  const [pagination, setPagination] = useState<PaginationMetadata>({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const queryRef = useRef(query)
  queryRef.current = query

  const setPage = (page: number) => {
    abortRef.current?.abort()
    setQuery(current => ({ ...current, page }))
  }
  const setSearch = (search: string) => {
    abortRef.current?.abort()
    setQuery(current => ({ ...current, page: 1, search }))
  }

  const fetchTechnicians = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const current = queryRef.current
    setTechnicians([])
    setError(null)
    if (!isAuthenticated) {
      setLoadingTechnicians(false)
      return
    }
    setLoadingTechnicians(true)
    try {
      const result = await getTechniciansPage(current, { signal: controller.signal })
      if (controller.signal.aborted) return
      const lastPage = Math.max(1, result.pagination.totalPages)
      if (!result.data.length && current.page > lastPage) {
        setQuery({ ...current, page: lastPage })
        return
      }
      setTechnicians(result.data)
      setPagination(result.pagination)
    } catch (err) {
      if (controller.signal.aborted) return
      setError(err instanceof Error ? err.message : t('common.error'))
      setPagination({ ...current, total: 0, totalPages: 0 })
    } finally {
      if (!controller.signal.aborted) setLoadingTechnicians(false)
    }
  }, [isAuthenticated, userId, tenantId, t])

  useEffect(() => {
    void fetchTechnicians()
    return () => abortRef.current?.abort()
  }, [fetchTechnicians, query])

  const addTechnician = useCallback(
    async (
      username: string, 
      password: string, 
      fullName: string,
      email?: string,
      documento?: string,
      profilePhoto?: File | null
    ): Promise<{ message: string }> => {
      if (!isAuthenticated) {
        throw new Error(t('personal.noPermission'))
      }

      try {
        const response = await userRegister(username, password, fullName, email, documento, profilePhoto)
        const message = response?.message || t('personal.userCreated')

        // Actualizar lista de técnicos
        await fetchTechnicians()

        // Mostrar modal de éxito
        setResponseMessage(message)
        setIsError(false)
        setShowModal(true)

        return { message }
      } catch (err: any) {
        setResponseMessage(err.message || t('personal.errorCreatingUser'))
        setIsError(true)
        setShowModal(true)
        throw new Error(err.message)
      }
    },
    [isAuthenticated, fetchTechnicians, t],
  )

  const closeModal = useCallback(() => {
    setShowModal(false)
    setResponseMessage("")
    setIsError(false)
  }, [])

  const showSuccess = (message: string) => {
    setResponseMessage(message)
    setIsError(false)
    setShowModal(true)
  }
  const showError = (message: string) => {
    setResponseMessage(message)
    setIsError(true)
    setShowModal(true)
  }

  return {
    pagination,
    search: query.search,
    setPage,
    setSearch,
    error,
    showModal,
    responseMessage,
    isError,
    closeModal,
    technicians,
    loadingTechnicians,
    fetchTechnicians,
    addTechnician,
    showSuccess,
    showError,
  }
}
