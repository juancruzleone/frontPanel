import { fetchWithAuthRetry, getHeadersWithContentType, getAuthHeaders } from "../../../shared/utils/apiHeaders"

const rawApiUrl = import.meta.env.VITE_API_URL || "/api/"
const API_URL = rawApiUrl.endsWith("/") ? rawApiUrl : `${rawApiUrl}/`

export const createClient = async (username: string, password: string, fullName: string) => {
    const headers = getHeadersWithContentType()

    // Separar fullName en firstName y lastName; asegurar lastName no vacío para evitar 400/NOT_FOUND del backend
    const nameParts = fullName.trim().split(/\s+/).filter(Boolean)
    const firstName = nameParts[0] || username || ''
    let lastName = nameParts.slice(1).join(' ') || ''
    // Si solo hay un nombre (caso username como fullName), duplica como apellido para cumplir validación del backend
    if (!lastName) {
        lastName = firstName
    }
    // Nombre completo de respaldo para compatibilidad con backends que esperan "nombre"
    const nombre = fullName.trim() || `${firstName} ${lastName}`.trim()

    // Email de respaldo para backends que validan email obligatorio en cliente
    const emailFallback = `${username.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 30) || "user"}@leonix.local`

    // ✅ USAR LA NUEVA RUTA ESPECÍFICA PARA CLIENTES (normalizada con trailing slash)
    const response = await fetchWithAuthRetry(`${API_URL}cuenta/cliente`, {
        method: "POST",
        headers,
        body: JSON.stringify({
            userName: username,
            password: password,
            firstName: firstName,
            lastName: lastName,
            nombre: nombre,
            email: emailFallback
            // ✅ YA NO ES NECESARIO ENVIAR EL ROL - El backend lo establece automáticamente
        }),
    })

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({} as any))

        // Maneja múltiples formatos de error del backend (error.details, details, errors)
        const details =
            (errorData?.error?.details && Array.isArray(errorData.error.details) && errorData.error.details) ||
            (errorData?.details && Array.isArray(errorData.details) && errorData.details) ||
            (errorData?.error?.errors && Array.isArray(errorData.error.errors) && errorData.error.errors) ||
            null
        if (details) {
            throw new Error(details.join(", "))
        }

        // Backend puede responder 400 VALIDATION_ERROR / 404 NOT_FOUND cuando la validación falla; expone código para debug
        const code = errorData?.error?.code || errorData?.code
        const message = errorData?.error?.message || errorData?.message || "Error al registrar el cliente"
        if (code) {
            throw new Error(`${message} (${code})`)
        }
        throw new Error(message)
    }

    return await response.json()
}

export const getClients = async () => {
    const headers = getAuthHeaders()

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

export const deleteClient = async (id: string) => {
    const headers = getAuthHeaders()

    const response = await fetchWithAuthRetry(`${API_URL}clientes-usuarios/${id}`, {
        method: "DELETE",
        headers,
    })

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || "Error al eliminar cliente")
    }

    return await response.json()
}

export const updateClient = async (id: string, data: { userName?: string; password?: string; name?: string; email?: string }) => {
    const headers = getHeadersWithContentType()

    // Mapear 'name' a 'nombre' para coincidir con el backend
    const backendData: any = {}
    if (data.userName) backendData.userName = data.userName
    if (data.password) backendData.password = data.password
    if (data.name) backendData.nombre = data.name
    if (data.email) {
        // ✅ Normalizar email a minúsculas
        backendData.email = data.email.toLowerCase().trim()
    }

    const response = await fetchWithAuthRetry(`${API_URL}clientes-usuarios/${id}`, {
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

export const assignInstallationsToClient = async (clientId: string, installationIds: string[]) => {
    const headers = getHeadersWithContentType()

    const response = await fetchWithAuthRetry(`${API_URL}clientes-usuarios/${clientId}/instalaciones`, {
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
