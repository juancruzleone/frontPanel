import * as Yup from "yup"

export const assetSchema = Yup.object().shape({
  assetId: Yup.string().required("Debe seleccionar un activo"),
  ubicacion: Yup.string()
    .required("La ubicación es requerida")
    .min(1, "La ubicación debe tener al menos 1 carácter")
    .max(255, "La ubicación no puede tener más de 255 caracteres"),
  categoria: Yup.string()
    .required("La categoría es requerida")
    .max(100, "La categoría no puede tener más de 100 caracteres"),
})

export const deviceEditSchema = Yup.object().shape({
  nombre: Yup.string()
    .required("El nombre del dispositivo es requerido")
    .min(1, "El nombre debe tener al menos 1 carácter")
    .max(100, "El nombre no puede tener más de 100 caracteres"),
  ubicacion: Yup.string()
    .required("La ubicación es requerida")
    .min(1, "La ubicación debe tener al menos 1 carácter")
    .max(255, "La ubicación no puede tener más de 255 caracteres"),
  categoria: Yup.string()
    .required("La categoría es requerida")
    .max(100, "La categoría no puede tener más de 100 caracteres"),
  estado: Yup.string()
    .required("El estado es requerido")
    .oneOf(
      ["Activo", "Inactivo", "En mantenimiento", "Fuera de servicio", "Pendiente de revisión"],
      "El estado debe ser válido",
    ),
  marca: Yup.string().max(100, "La marca no puede tener más de 100 caracteres"),
  modelo: Yup.string().max(100, "El modelo no puede tener más de 100 caracteres"),
  numeroSerie: Yup.string().max(100, "El número de serie no puede tener más de 100 caracteres"),
})

export const validateForm = async (schema: Yup.ObjectSchema<any>, data: any) => {
  try {
    await schema.validate(data, { abortEarly: false })
    return { isValid: true, errors: {} }
  } catch (err: any) {
    const errors: Record<string, string> = {}
    if (err.inner) {
      err.inner.forEach((error: any) => {
        if (error.path) {
          errors[error.path] = error.message
        }
      })
    }
    return { isValid: false, errors }
  }
}
