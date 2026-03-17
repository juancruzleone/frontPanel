/**
 * Utilidades para manejo de imágenes
 */

const API_URL = import.meta.env.VITE_API_URL;

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
