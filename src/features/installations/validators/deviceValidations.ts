import * as Yup from "yup";

export const assetSchema = Yup.object().shape({
  assetId: Yup.string().required("Debe seleccionar un activo"),
  ubicacion: Yup.string()
    .required("La ubicación es requerida")
    .min(3, "La ubicación debe tener al menos 3 caracteres")
    .max(255, "La ubicación no puede tener más de 255 caracteres"),
  categoria: Yup.string()
    .required("La categoría es requerida")
    .min(3, "La categoría debe tener al menos 3 caracteres")
    .max(100, "La categoría no puede tener más de 100 caracteres"),
});

export const validateForm = async (schema: Yup.ObjectSchema<any>, data: any) => {
  try {
    await schema.validate(data, { abortEarly: false });
    return { isValid: true, errors: {} };
  } catch (err: any) {
    const errors: Record<string, string> = {};
    err.inner.forEach((e: any) => {
      errors[e.path] = e.message;
    });
    return { isValid: false, errors };
  }
};