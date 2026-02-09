import * as Yup from "yup"

export const assetSchema = Yup.object().shape({
  assetId: Yup.string().required('installations.validation.selectAsset'),
  ubicacion: Yup.string()
    .required('installations.validation.locationRequired')
    .min(1, 'installations.validation.locationMin')
    .max(255, 'installations.validation.locationMax'),
  categoria: Yup.string()
    .required('installations.validation.categoryRequired')
    .max(100, 'installations.validation.categoryMax'),
  cantidad: Yup.number()
    .typeError('installations.validation.quantityMustBeNumber')
    .integer('installations.validation.quantityMustBeInteger')
    .min(1, 'installations.validation.quantityMin')
    .max(100, 'installations.validation.quantityMax')
    .required('installations.validation.quantityRequired'),
})

export const deviceEditSchema = Yup.object().shape({
  ubicacion: Yup.string()
    .required('installations.validation.locationRequired')
    .min(1, 'installations.validation.locationMin')
    .max(255, 'installations.validation.locationMax'),
  categoria: Yup.string()
    .required('installations.validation.categoryRequired')
    .max(100, 'installations.validation.categoryMax'),
  estado: Yup.string()
    .required('installations.validation.statusRequired')
    .oneOf(
      ['Activo', 'Inactivo', 'En mantenimiento', 'Fuera de servicio', 'Pendiente de revisión'],
      'installations.validation.statusInvalid',
    ),
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
