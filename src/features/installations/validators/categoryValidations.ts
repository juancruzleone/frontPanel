interface ValidationResult {
    isValid: boolean;
    errors: Record<string, string>;
  }
  
  export const validateCategoryForm = (formData: any): ValidationResult => {
    const errors: Record<string, string> = {};
  
    if (!formData.nombre || formData.nombre.trim().length < 2) {
      errors.nombre = "El nombre debe tener al menos 2 caracteres";
    }
  
    if (formData.descripcion && formData.descripcion.length > 255) {
      errors.descripcion = "La descripción no puede exceder 255 caracteres";
    }
  
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  };