
import { fetchWithCsrf } from "../utils/apiHeaders"

const API_URL = import.meta.env.VITE_API_URL || "/api/"

/**
 * Sube un archivo binario al servidor y retorna la URL remota.
 * Este servicio es utilizado por el proceso de sincronización offline
 * para subir las fotos/archivos capturados antes de enviar la mutación final.
 */
export const uploadBinary = async (blob: Blob, filename: string, binaryId: string): Promise<string> => {
  const formData = new FormData()
  // Usamos el campo 'file' que es el estándar en el backend para multer
  formData.append('file', blob, filename)
  formData.append('binaryId', binaryId)
  
  const response = await fetchWithCsrf(`${API_URL}uploads/binary`, {
    method: 'POST',
    body: formData,
  })
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error?.message || errorData.message || 'Error al subir el archivo binario')
  }
  
  const data = await response.json()
  return data.url
}
