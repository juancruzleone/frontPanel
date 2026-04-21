import { useState, useCallback } from "react"
import { createClient, getClients } from "../services/clientServices"
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

    const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

    const fetchClients = useCallback(async () => {
        if (!isAuthenticated) return

        setLoadingClients(true)
        try {
            const data = await getClients()
            setClients(Array.isArray(data) ? data : [])
        } catch (error) {
            setClients([])
        } finally {
            setLoadingClients(false)
        }
    }, [isAuthenticated])

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
