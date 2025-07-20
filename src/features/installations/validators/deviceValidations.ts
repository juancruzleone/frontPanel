import * as Yup from "yup"

export const assetSchema = Yup.object().shape({
  assetId: Yup.string().required('validations.selectAsset'),
  ubicacion: Yup.string()
    .required('validations.locationRequired')
    .min(1, 'validations.locationMin')
    .max(255, 'validations.locationMax'),
  categoria: Yup.string()
    .required('validations.categoryRequired')
    .max(100, 'validations.categoryMax'),
})

export const deviceEditSchema = Yup.object().shape({
  nombre: Yup.string()
    .required('validations.deviceNameRequired')
    .min(1, 'validations.deviceNameMin')
    .max(100, 'validations.deviceNameMax'),
  ubicacion: Yup.string()
    .required('validations.locationRequired')
    .min(1, 'validations.locationMin')
    .max(255, 'validations.locationMax'),
  categoria: Yup.string()
    .required('validations.categoryRequired')
    .max(100, 'validations.categoryMax'),
  estado: Yup.string()
    .required('validations.statusRequired')
    .oneOf(
      ['Activo', 'Inactivo', 'En mantenimiento', 'Fuera de servicio', 'Pendiente de revisión'],
      'validations.statusInvalid',
    ),
  marca: Yup.string().max(100, 'validations.brandMax'),
  modelo: Yup.string().max(100, 'validations.modelMax'),
  numeroSerie: Yup.string().max(100, 'validations.serialMax'),
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
