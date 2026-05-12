import * as yup from "yup"
import type { TFunction } from "i18next"

interface SupplierFormData {
  name: string
  contactName?: string
  email?: string
  phone?: string
  address?: string
}

export const getSupplierSchema = (t: TFunction) => yup.object().shape({
  name: yup.string().required(t('suppliers.validation.nameRequired')),
  contactName: yup.string(),
  email: yup.string().email(t('suppliers.validation.emailInvalid')).nullable().transform(v => v === "" ? null : v),
  phone: yup.string(),
  address: yup.string(),
})

export const validateSupplierForm = async (data: SupplierFormData, t: TFunction) => {
  const schema = getSupplierSchema(t)

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

export const validateSupplierField = async (name: string, value: any, t: TFunction) => {
  const schema = getSupplierSchema(t)
  try {
    await schema.validateAt(name, { [name]: value })
    return { isValid: true, error: "" }
  } catch (err: unknown) {
    if (err instanceof yup.ValidationError) {
      return { isValid: false, error: err.message }
    }
    return { isValid: false, error: "Invalid field" }
  }
}
