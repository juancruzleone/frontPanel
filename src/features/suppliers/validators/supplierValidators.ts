import * as yup from "yup"
import type { TFunction } from "i18next"

interface SupplierFormData {
  name: string
  contactName?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  taxId?: string
  notes?: string
  active?: boolean
}

export const getSupplierSchema = (t: TFunction) => yup.object().shape({
  name: yup.string().required(t('suppliers.validation.nameRequired')),
  contactName: yup.string().optional(),
  email: yup.string().email(t('suppliers.validation.emailInvalid')).nullable().transform(v => v === "" ? null : v).optional(),
  phone: yup.string().optional(),
  address: yup.string().optional(),
  city: yup.string().optional(),
  taxId: yup.string().optional(),
  notes: yup.string().optional(),
  active: yup.boolean().default(true),
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
