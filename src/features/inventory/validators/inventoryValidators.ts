import * as yup from "yup"

export const getInventorySchema = (t: (key: string) => string) =>
  yup.object({
    name: yup.string().trim().required(t("inventory.validation.nameRequired")),
    unit: yup.string().trim().required(t("inventory.validation.unitRequired")),
    currentStock: yup.number()
        .typeError(t("inventory.validation.mustBeNumber"))
        .min(0, t("inventory.validation.minStock"))
        .default(0),
    minimumStock: yup.number()
        .typeError(t("inventory.validation.mustBeNumber"))
        .min(0, t("inventory.validation.minStock"))
        .default(0),
    category: yup.string().trim().optional(),
    location: yup.string().trim().optional(),
    code: yup.string().trim().optional(),
    active: yup.boolean().default(true),
    supplierId: yup.string().optional(),
    supplierSnapshot: yup.object({
      supplierId: yup.string().optional(),
      name: yup.string().required(),
      contactName: yup.string().optional(),
      email: yup.string().email().optional(),
      phone: yup.string().optional(),
    }).default(undefined).optional().nullable(),
  })

export const validateInventoryForm = async (data: any, t: (key: string) => string) => {
  const schema = getInventorySchema(t)
  try {
    await schema.validate(data, { abortEarly: false })
    return { isValid: true, errors: {} as Record<string, string> }
  } catch (err: any) {
    const errors: Record<string, string> = {}
    err.inner.forEach((e: any) => {
      errors[e.path] = e.message
    })
    return { isValid: false, errors }
  }
}

export const validateInventoryField = async (name: string, value: any, t: (key: string) => string) => {
  const schema = getInventorySchema(t)
  try {
    await schema.validateAt(name, { [name]: value })
    return { isValid: true, error: "" }
  } catch (err: any) {
    return { isValid: false, error: err.message }
  }
}
