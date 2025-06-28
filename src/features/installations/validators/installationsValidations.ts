import * as yup from "yup"

export const installationSchema = yup.object({
  company: yup.string().trim().required("La empresa es obligatoria"),
  address: yup.string().trim().required("La dirección es obligatoria"),
  installationType: yup.string().trim().required("El tipo de instalación es obligatorio"),
  floorSector: yup.string().trim().required("El piso o sector es obligatorio"),
  postalCode: yup.string().trim().required("El código postal es obligatorio"),
  city: yup.string().trim().required("La ciudad es obligatoria"),
  province: yup.string().trim().required("La provincia es obligatoria"),
})

export const validateInstallationForm = async (data: any) => {
  try {
    await installationSchema.validate(data, { abortEarly: false })
    return { isValid: true, errors: {} }
  } catch (err: any) {
    const errors: Record<string, string> = {}
    err.inner.forEach((e: any) => {
      errors[e.path] = e.message
    })
    return { isValid: false, errors }
  }
}
