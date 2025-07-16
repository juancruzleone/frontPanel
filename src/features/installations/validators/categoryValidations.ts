import { TFunction } from "i18next";

interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export const getCategorySchema = (t: TFunction) => ({
  nombre: {
    required: t("installations.validation.categoryNameRequired"),
    min: t("installations.validation.categoryNameMin"),
  },
  descripcion: {
    max: t("installations.validation.categoryDescriptionMax"),
  },
});

export const validateCategoryForm = (formData: any, t: TFunction): ValidationResult => {
  const errors: Record<string, string> = {};
  const schema = getCategorySchema(t);

  if (!formData.nombre || formData.nombre.trim().length === 0) {
    errors.nombre = schema.nombre.required;
  } else if (formData.nombre.trim().length < 2) {
    errors.nombre = schema.nombre.min;
  }

  if (formData.descripcion && formData.descripcion.length > 255) {
    errors.descripcion = schema.descripcion.max;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateCategoryField = (
  fieldName: string,
  value: any,
  allData: any,
  t: TFunction
): { isValid: boolean; error: string | null } => {
  const schema = getCategorySchema(t);
  if (fieldName === "nombre") {
    if (!value || value.trim().length === 0) {
      return { isValid: false, error: schema.nombre.required };
    } else if (value.trim().length < 2) {
      return { isValid: false, error: schema.nombre.min };
    }
  }
  if (fieldName === "descripcion") {
    if (value && value.length > 255) {
      return { isValid: false, error: schema.descripcion.max };
    }
  }
  return { isValid: true, error: null };
};