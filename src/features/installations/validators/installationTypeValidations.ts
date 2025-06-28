interface ValidationResult {
    isValid: boolean;
    errors: Record<string, string>;
  }
  
  export const validateInstallationTypeForm = (formData: any): ValidationResult => {
    const errors: Record<string, string> = {};
  
    if (!formData.nombre || formData.nombre.trim().length < 2) {
      errors.nombre = "El nombre debe tener al menos 2 caracteres";
    } else if (formData.nombre.length > 50) {
      errors.nombre = "El nombre no puede exceder 50 caracteres";
    }
  
    if (formData.descripcion && formData.descripcion.length > 200) {
      errors.descripcion = "La descripción no puede exceder 200 caracteres";
    }
  
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  };