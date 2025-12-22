import { getHeadersWithContentType, getAuthHeaders } from "../../../shared/utils/apiHeaders"

const API_URL = import.meta.env.VITE_API_URL

export const createClient = async (username: string, password: string, fullName: string, token: string) => {
    const headers = getHeadersWithContentType()
    headers.Authorization = `Bearer ${token}`

    const response = await fetch(`${API_URL}clientes-usuarios`, {
        method: "POST",
        headers,
        body: JSON.stringify({
            userName: username,
            password: password,
            nombre: fullName
            // role: 'cliente' no es necesario, el backend lo asigna automáticamente
        }),
    })

    if (!response.ok) {
        const errorData = await response.json()

        if (errorData.error.details && Array.isArray(errorData.error.details)) {
            throw new Error(errorData.error.details.join(", "))
        }

        throw new Error(errorData.error.message || "Error al registrar el cliente")
    }

    return await response.json()
}

export const getClients = async (token: string) => {
    const headers = getAuthHeaders()
    headers.Authorization = `Bearer ${token}`

    // Usar el endpoint específico para clientes-usuarios
    const response = await fetch(`${API_URL}clientes-usuarios`, {
        method: "GET",
        headers,
    })

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || "Error al obtener clientes")
    }

    const data = await response.json()
    // El backend ya devuelve solo usuarios con rol 'cliente', no es necesario filtrar
    return Array.isArray(data) ? data : []
}

export const deleteClient = async (id: string, token: string) => {
    const headers = getAuthHeaders()
    headers.Authorization = `Bearer ${token}`

    const response = await fetch(`${API_URL}clientes-usuarios/${id}`, {
        method: "DELETE",
        headers,
    })

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || "Error al eliminar cliente")
    }

    return await response.json()
}

export const updateClient = async (id: string, data: { userName?: string; password?: string; name?: string; email?: string }, token: string) => {
    const headers = getHeadersWithContentType()
    headers.Authorization = `Bearer ${token}`

    // Mapear 'name' a 'nombre' para coincidir con el backend
    const backendData: any = {}
    if (data.userName) backendData.userName = data.userName
    if (data.password) backendData.password = data.password
    if (data.name) backendData.nombre = data.name
    if (data.email) backendData.email = data.email

    const response = await fetch(`${API_URL}clientes-usuarios/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(backendData),
    })

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || "Error al actualizar el cliente")
    }

    return await response.json()
}

export const assignInstallationsToClient = async (clientId: string, installationIds: string[], token: string) => {
    const headers = getHeadersWithContentType()
    headers.Authorization = `Bearer ${token}`

    const response = await fetch(`${API_URL}clientes-usuarios/${clientId}/instalaciones`, {
        method: "POST",
        headers,
        body: JSON.stringify({ instalaciones: installationIds }),
    })

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || "Error al asignar instalaciones al cliente")
    }

    return await response.json()
}
