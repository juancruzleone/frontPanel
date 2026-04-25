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
