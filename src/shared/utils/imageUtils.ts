/**
 * Utilidades para manejo de imágenes
 */

const API_URL = import.meta.env.VITE_API_URL || "/api/";

export interface CompressImageOptions {
	maxWidth?: number;
	maxHeight?: number;
	quality?: number;
}

export interface CompressedImage {
	blob: Blob;
	dataURL: string;
	filename: string;
}

/**
 * Comprime una imagen redimensionándola y exportándola como JPEG.
 * @param file - Archivo de imagen original
 * @param options - Opciones de compresión
 * @returns Promesa con el blob comprimido, dataURL y nombre de archivo
 */
export async function compressImage(
	file: File,
	options: CompressImageOptions = {},
): Promise<CompressedImage> {
	const { maxWidth = 1280, maxHeight = 1280, quality = 0.7 } = options;

	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
		reader.onload = () => {
			const src = reader.result;
			if (typeof src !== "string") {
				reject(new Error("Formato de imagen inválido"));
				return;
			}

			const img = new Image();
			img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
			img.onload = () => {
				const ratio = Math.min(1, maxWidth / img.width, maxHeight / img.height);
				const canvas = document.createElement("canvas");
				canvas.width = Math.round(img.width * ratio);
				canvas.height = Math.round(img.height * ratio);

				const ctx = canvas.getContext("2d");
				if (!ctx) {
					reject(new Error("Canvas no disponible"));
					return;
				}

				ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
				const dataURL = canvas.toDataURL("image/jpeg", quality);
				const blob = dataURLtoBlob(dataURL);
				const filename = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
				resolve({ blob, dataURL, filename });
			};
			img.src = src;
		};

		reader.readAsDataURL(file);
	});
}

/**
 * Construye la URL completa de una imagen de perfil
 * @param photoPath - Ruta de la foto que viene del backend (puede ser relativa o absoluta)
 * @returns URL completa de la imagen o null si no hay foto
 */
export const getProfilePhotoUrl = (
	photoPath: string | null | undefined,
): string | null => {
	if (!photoPath) return null;

	// Si ya es una URL completa (http:// o https://), devolverla tal cual
	if (photoPath.startsWith("http://") || photoPath.startsWith("https://")) {
		return photoPath;
	}

	// Si es una ruta relativa, construir la URL completa
	// Remover el /api/ del final de API_URL si existe y agregar la ruta de la foto
	const baseUrl = API_URL.replace(/\/api\/?$/, "");

	// Asegurar que photoPath comience con /
	const normalizedPath = photoPath.startsWith("/")
		? photoPath
		: `/${photoPath}`;

	return `${baseUrl}${normalizedPath}`;
};

/**
 * Convierte una cadena dataURL (base64) a un objeto Blob
 */
export const dataURLtoBlob = (dataurl: string): Blob => {
	const arr = dataurl.split(",");
	const mimeMatch = arr[0].match(/:(.*?);/);
	const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
	const bstr = atob(arr[1]);
	let n = bstr.length;
	const u8arr = new Uint8Array(n);
	while (n--) {
		u8arr[n] = bstr.charCodeAt(n);
	}
	return new Blob([u8arr], { type: mime });
};
