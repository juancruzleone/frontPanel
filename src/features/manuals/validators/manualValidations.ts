import { Manual } from '../hooks/useManuals';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export const validateManualForm = async (data: Partial<Manual>): Promise<ValidationResult> => {
  const errors: Record<string, string> = {};

  // Validar nombre
  if (!data.nombre || !data.nombre.trim()) {
    errors.nombre = 'El nombre del manual es obligatorio';
  } else if (data.nombre.trim().length < 3) {
    errors.nombre = 'El nombre debe tener al menos 3 caracteres';
  } else if (data.nombre.trim().length > 100) {
    errors.nombre = 'El nombre no puede exceder 100 caracteres';
  }

  // Validar descripción
  if (data.descripcion && data.descripcion.length > 500) {
    errors.descripcion = 'La descripción no puede exceder 500 caracteres';
  }

  // Validar assetId
  if (!data.assetId || !data.assetId.trim()) {
    errors.assetId = 'Debe seleccionar un activo';
  }

  // Validar categoría
  const validCategories = [
    'Manual de usuario',
    'Manual técnico',
    'Manual de mantenimiento',
    'Guía de instalación',
    'Otros'
  ];
  if (data.categoria && !validCategories.includes(data.categoria)) {
    errors.categoria = 'La categoría seleccionada no es válida';
  }

  // Validar versión
  if (data.version && data.version.length > 20) {
    errors.version = 'La versión no puede exceder 20 caracteres';
  }

  // Validar idioma
  const validLanguages = ['es', 'en', 'pt', 'fr'];
  if (data.idioma && !validLanguages.includes(data.idioma)) {
    errors.idioma = 'El idioma seleccionado no es válido';
  }

  // Validar autor
  if (data.autor && data.autor.length > 100) {
    errors.autor = 'El nombre del autor no puede exceder 100 caracteres';
  }

  // Validar tags
  if (data.tags && Array.isArray(data.tags)) {
    if (data.tags.length > 10) {
      errors.tags = 'No se pueden agregar más de 10 tags';
    }

    const invalidTags = data.tags.filter(tag =>
      typeof tag !== 'string' || tag.trim().length === 0 || tag.length > 30
    );

    if (invalidTags.length > 0) {
      errors.tags = 'Los tags deben ser texto válido y no exceder 30 caracteres';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateFileUpload = (file: File): ValidationResult => {
  const errors: Record<string, string> = {};

  if (!file) {
    errors.archivo = 'Se requiere un archivo';
    return { isValid: false, errors };
  }

  // Validar tipo de archivo
  if (file.type !== 'application/pdf') {
    errors.archivo = 'Solo se permiten archivos PDF';
  }

  // Validar tamaño (máximo 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB en bytes
  if (file.size > maxSize) {
    errors.archivo = 'El archivo no puede exceder 10MB';
  }

  // Validar nombre del archivo
  if (file.name.length > 255) {
    errors.archivo = 'El nombre del archivo es demasiado largo';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
