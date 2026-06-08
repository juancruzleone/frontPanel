/**
 * Utilidades para manejo de imágenes
 */

const API_URL = import.meta.env.VITE_API_URL || "/api/";

/**
 * Construye la URL completa de una imagen de perfil
 * @param photoPath - Ruta de la foto que viene del backend (puede ser relativa o absoluta)
 * @returns URL completa de la imagen o null si no hay foto
 */
export const getProfilePhotoUrl = (photoPath: string | null | undefined): string | null => {
  if (!photoPath) return null;

  // Si ya es una URL completa (http:// o https://), devolverla tal cual
  if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
    return photoPath;
  }

  // Si es una ruta relativa, construir la URL completa
  // Remover el /api/ del final de API_URL si existe y agregar la ruta de la foto
  const baseUrl = API_URL.replace(/\/api\/?$/, '');
  
  // Asegurar que photoPath comience con /
  const normalizedPath = photoPath.startsWith('/') ? photoPath : `/${photoPath}`;
  
  return `${baseUrl}${normalizedPath}`;
};

/**
 * Convierte una cadena dataURL (base64) a un objeto Blob
 */
export const dataURLtoBlob = (dataurl: string): Blob => {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};
