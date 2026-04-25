import * as yup from "yup"

export const validateSupplierForm = async (data: any, t: any) => {
  const schema = yup.object().shape({
    name: yup.string().required(t('suppliers.validation.nameRequired')),
    contactName: yup.string(),
    email: yup.string().email(t('suppliers.validation.emailInvalid')).nullable(),
    phone: yup.string(),
    address: yup.string(),
  })

  try {
    await schema.validate(data, { abortEarly: false })
    return { isValid: true, errors: {} }
  } catch (err: any) {
    const errors: Record<string, string> = {}
    err.inner.forEach((error: any) => {
      errors[error.path] = error.message
    })
    return { isValid: false, errors }
  }
}
