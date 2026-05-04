import * as yup from "yup"
import type { TFunction } from "i18next"

interface SupplierFormData {
  name: string
  contactName?: string
  email?: string
  phone?: string
  address?: string
}

export const validateSupplierForm = async (data: SupplierFormData, t: TFunction) => {
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
  } catch (err: unknown) {
    const errors: Record<string, string> = {}
    if (err instanceof yup.ValidationError) {
      err.inner.forEach((error) => {
        if (error.path) errors[error.path] = error.message
      })
    }
    return { isValid: false, errors }
  }
}
