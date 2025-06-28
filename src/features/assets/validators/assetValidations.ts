import * as yup from "yup";

export const assetSchema = yup.object({
  nombre: yup.string().trim().required("El nombre es obligatorio"),
  marca: yup.string().trim().required("La marca es obligatoria"),
  modelo: yup.string().trim().required("El modelo es obligatorio"),
  numeroSerie: yup.string().trim().required("El número de serie es obligatorio"),
  categoria: yup.string().trim(),
  ubicacion: yup.string().trim(),
  estado: yup.string().trim().oneOf(
    ["Activo", "Inactivo", "En mantenimiento", "Fuera de servicio", "Pendiente de revisión"],
    "Estado no válido"
  ),
  templateId: yup.string().trim(),
});

export const validateAssetForm = async (data: any) => {
  try {
    await assetSchema.validate(data, { abortEarly: false });
    return { isValid: true, errors: {} };
  } catch (err: any) {
    const errors: Record<string, string> = {};
    err.inner.forEach((e: any) => {
      errors[e.path] = e.message;
    });
    return { isValid: false, errors };
  }
};

export const templateAssignmentSchema = yup.object({
  templateId: yup.string().trim().required("Se requiere seleccionar una plantilla"),
});

export const validateTemplateAssignment = async (data: any) => {
  try {
    await templateAssignmentSchema.validate(data, { abortEarly: false });
    return { isValid: true, errors: {} };
  } catch (err: any) {
    const errors: Record<string, string> = {};
    err.inner.forEach((e: any) => {
      errors[e.path] = e.message;
    });
    return { isValid: false, errors };
  }
};