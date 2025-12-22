import { getHeadersWithContentType, getHeadersWithoutContentType } from '../../../shared/utils/apiHeaders'

const API_URL = import.meta.env.VITE_API_URL

export interface BudgetDocument {
    _id: string
    tipoDocumento: 'presupuesto' | 'contrato' | 'otro'
    descripcion?: string
    archivo: {
        url: string
        publicId: string
        nombreOriginal: string
        tamaño: number
        formato: string
        fechaSubida: string
    }
    uploadedBy: string
    createdAt: string
}

export interface UploadDocumentData {
    tipoDocumento: 'presupuesto' | 'contrato' | 'otro'
    descripcion?: string
    archivo: File
}

// Subir documento de presupuesto/contrato a una instalación
export const uploadBudgetDocument = async (
    installationId: string,
    data: UploadDocumentData
): Promise<BudgetDocument> => {
    const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL
    const url = `${baseUrl}/installations/${installationId}/documentos`

    const formData = new FormData()
    formData.append('archivo', data.archivo)
    formData.append('tipoDocumento', data.tipoDocumento)
    if (data.descripcion) {
        formData.append('descripcion', data.descripcion)
    }

    // Get headers pero sin Content-Type (el navegador lo setea automáticamente para FormData)
    const headers = getHeadersWithoutContentType()

    const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
    })

    const responseData = await response.json()

    if (!response.ok) {
        throw new Error(responseData.error?.message || responseData.message || 'Error al subir el documento')
    }

    return responseData.data
}

// Obtener documentos de una instalación
export const getBudgetDocuments = async (
    installationId: string
): Promise<BudgetDocument[]> => {
    const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL
    const url = `${baseUrl}/installations/${installationId}/documentos`

    const response = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
    })

    const responseData = await response.json()

    if (!response.ok) {
        throw new Error(responseData.error?.message || responseData.message || 'Error al obtener los documentos')
    }

    return responseData.data || []
}

// Eliminar documento de una instalación
export const deleteBudgetDocument = async (
    installationId: string,
    documentId: string
): Promise<void> => {
    const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL
    const url = `${baseUrl}/installations/${installationId}/documentos/${documentId}`

    const response = await fetch(url, {
        method: 'DELETE',
        headers: getHeaders(),
    })

    const responseData = await response.json()

    if (!response.ok) {
        throw new Error(responseData.error?.message || responseData.message || 'Error al eliminar el documento')
    }
}
