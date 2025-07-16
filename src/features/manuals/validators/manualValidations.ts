import * as yup from "yup";
import { Manual } from '../hooks/useManuals';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export const getManualSchema = (t: (key: string) => string) =>
  yup.object({
    nombre: yup
      .string()
      .trim()
      .test('required-or-min', t('manuals.validation.nameRequired'), (value) => !!value && value.trim().length > 0)
      .test('min', t('manuals.validation.nameMin'), (value) => {
        if (!value || value.trim().length === 0) return true; // Si está vacío, que lo maneje el required
        return value.trim().length >= 3;
      })
      .max(100, t('manuals.validation.nameMax')),
    descripcion: yup
      .string()
      .max(500, t('manuals.validation.descriptionMax')),
    assetId: yup
      .string()
      .required(t('manuals.validation.assetRequired')),
    categoria: yup
      .string()
      .oneOf([
        t('manuals.userManual'),
        t('manuals.technicalManual'),
        t('manuals.maintenanceManual'),
        t('manuals.installationGuide'),
        t('manuals.others')
      ], t('manuals.validation.categoryInvalid')),
    version: yup
      .string()
      .max(20, t('manuals.validation.versionMax')),
    idioma: yup
      .string()
      .oneOf(['es', 'en', 'pt', 'fr'], t('manuals.validation.languageInvalid')),
    autor: yup
      .string()
      .max(100, t('manuals.validation.authorMax')),
    tags: yup
      .array()
      .of(yup.string().max(30, t('manuals.validation.tagMax')).required())
      .max(10, t('manuals.validation.tagsMax')),
  });

export const validateManualForm = async (data: Partial<Manual>, t: (key: string) => string): Promise<ValidationResult> => {
  const schema = getManualSchema(t);
  try {
    await schema.validate(data, { abortEarly: false });
    return { isValid: true, errors: {} };
  } catch (err: any) {
    const errors: Record<string, string> = {};
    if (err.inner && Array.isArray(err.inner)) {
      err.inner.forEach((e: any) => {
        if (e.path) {
          errors[e.path] = e.message;
        }
      });
    } else if (err.path) {
      errors[err.path] = err.message;
    } else {
      errors._error = err.message || t('manuals.validation.unknownError');
    }
    return { isValid: false, errors };
  }
};

export const validateManualField = async (fieldName: string, value: any, allData: any, t: (key: string) => string) => {
  const schema = getManualSchema(t);
  try {
    await schema.validateAt(fieldName, { ...allData, [fieldName]: value });
    return { isValid: true, error: null };
  } catch (err: any) {
    return { isValid: false, error: err.message };
  }
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
