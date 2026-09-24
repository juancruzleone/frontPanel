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

    // Para el panel admin, la ruta correcta es clientes-usuarios (schema createClientUser: password min 6, nombre requerido)
    // cuenta/cliente usa cuentaRegistro (password min 8 con especial) y es para registro técnico; no usar como primario para cliente
    const payloadClientesUsuarios: Record<string, unknown> = {
        userName: username,
        password: password,
        nombre: nombre,
    }
    const payloadCuentaCliente: Record<string, unknown> = {
        userName: username,
        password: password,
        firstName: firstName,
        lastName: lastName,
        nombre: nombre,
    }

    const tryCreate = async (url: string, body: Record<string, unknown>) => {
        return await fetchWithAuthRetry(url, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
        })
    }

    // Intento primario: clientes-usuarios (permite password Francosa4191 sin especial, solo min 6)
    let response = await tryCreate(`${API_URL}clientes-usuarios`, payloadClientesUsuarios)

    // Fallback: cuenta/cliente por compatibilidad si el backend no tiene clientes-usuarios o requiere firstName/lastName
    if (!response.ok && [400, 404, 503].includes(response.status)) {
        const firstError = await response.clone().json().catch(() => ({} as any))
        const firstCode = firstError?.error?.code || firstError?.code
        const firstDetails = firstError?.error?.details || firstError?.details
        const isValidationError = firstCode === "VALIDATION_ERROR" || (Array.isArray(firstDetails) && firstDetails.length > 0)
        // Solo hace fallback si es NOT_FOUND/503 o validación por nombre (ej. si el backend espera cuenta/cliente)
        if (firstCode === "NOT_FOUND" || response.status === 503 || isValidationError) {
            const fallbackResponse = await tryCreate(`${API_URL}cuenta/cliente`, payloadCuentaCliente)
            if (fallbackResponse.ok) {
                return await fallbackResponse.json()
            }
            const fallbackError = await fallbackResponse.clone().json().catch(() => ({} as any))
            const hasFallbackDetails =
                (fallbackError?.error?.details && Array.isArray(fallbackError.error.details)) ||
                (fallbackError?.details && Array.isArray(fallbackError.details))
            // Prioriza el error más descriptivo (con details) o el que no sea NOT_FOUND genérico
            if (hasFallbackDetails || fallbackResponse.status === 400) {
                // Si el primario era NOT_FOUND genérico y el fallback trae VALIDATION_ERROR con details, usa fallback
                if (firstCode === "NOT_FOUND" && !firstDetails) {
                    response = fallbackResponse
                } else if (hasFallbackDetails) {
                    response = fallbackResponse
                }
            } else if (firstCode === "NOT_FOUND" && fallbackResponse.status !== 404) {
                response = fallbackResponse
            }
        }
    }

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

        const code = errorData?.error?.code || errorData?.code
        const message = errorData?.error?.message || errorData?.message || "Error al registrar el cliente"

        // 503 Service Unavailable: backend temporalmente caído (visto en logs como clientes:1 503)
        if (response.status === 503) {
            throw new Error(`${message} - Servicio temporalmente no disponible, intente nuevamente en unos segundos (${code || "503"})`)
        }

        // 400 VALIDATION_ERROR / 404 NOT_FOUND cuando la validación falla; expone código para debug
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
