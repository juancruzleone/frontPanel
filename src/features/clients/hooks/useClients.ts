import { useState, useCallback, useEffect, useRef } from "react"
import { createClient, getClientsPage } from "../services/clientServices"
import type { PageQuery, PaginationMetadata } from '../../../shared/types/pagination'
import { useAuthStore } from "../../../store/authStore"
import { useTranslation } from "react-i18next"

export interface Client {
    _id?: string
    id?: string
    userName: string
    name: string
    role: string
    createdAt: string
    status?: string
}

export function useClients() {
    const { t } = useTranslation();
    const [showModal, setShowModal] = useState(false)
    const [responseMessage, setResponseMessage] = useState("")
    const [isError, setIsError] = useState(false)
    const [clients, setClients] = useState<Client[]>([])
    const [loadingClients, setLoadingClients] = useState(true)

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

    const fetchClients = useCallback(async () => {
        abortRef.current?.abort()
        const controller = new AbortController()
        abortRef.current = controller
        const current = queryRef.current
        setClients([])
        setError(null)
        if (!isAuthenticated) {
            setLoadingClients(false)
            return
        }
        setLoadingClients(true)
        try {
            const rawResult = await getClientsPage(current, { signal: controller.signal })
            if (controller.signal.aborted) return
            const resultData = Array.isArray(rawResult)
              ? rawResult
              : Array.isArray((rawResult as any)?.data)
                ? (rawResult as any).data
                : []
            const resultPagination = !Array.isArray(rawResult) && (rawResult as any)?.pagination
              ? (rawResult as any).pagination
              : { page: current.page, limit: current.limit, total: resultData.length, totalPages: Math.ceil(resultData.length / current.limit) || 1 }
            const lastPage = Math.max(1, resultPagination.totalPages)
            if (!resultData.length && current.page > lastPage) {
                setQuery({ ...current, page: lastPage })
                return
            }
            setClients(resultData)
            setPagination(resultPagination)
        } catch (err) {
            if (controller.signal.aborted) return
            setError(err instanceof Error ? err.message : t('common.error'))
            setPagination({ ...current, total: 0, totalPages: 0 })
        } finally {
            if (!controller.signal.aborted) setLoadingClients(false)
        }
    }, [isAuthenticated, userId, tenantId, t])

    useEffect(() => {
        void fetchClients()
        return () => abortRef.current?.abort()
    }, [fetchClients, query])

    const addClient = useCallback(
        async (username: string, password: string, fullName: string): Promise<{ message: string }> => {
            if (!isAuthenticated) {
                throw new Error(t('clients.noPermission'))
            }

            try {
                const response = await createClient(username, password, fullName)
                const message = t('clients.clientCreated')

                await fetchClients()

                setResponseMessage(message)
                setIsError(false)
                setShowModal(true)

                return { message }
            } catch (err: any) {
                setResponseMessage(err.message || t('clients.errorCreatingClient'))
                setIsError(true)
                setShowModal(true)
                throw new Error(err.message)
            }
        },
        [isAuthenticated, fetchClients, t],
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
        clients,
        loadingClients,
        fetchClients,
        addClient,
        showSuccess,
        showError,
    }
}
