import * as yup from "yup"

export const getAssetSchema = (t: (key: string) => string) =>
  yup.object({
    nombre: yup.string().trim().required(t("assets.validation.nameRequired")),
    templateId: yup.string().trim().required(t("assets.validation.templateRequired")),
    marca: yup.string().trim().optional(),
    modelo: yup.string().trim().optional(),
    numeroSerie: yup.string().trim().optional(),
  })

export const validateAssetForm = async (data: any, t: (key: string) => string) => {
  const assetSchema = getAssetSchema(t)
  try {
    await assetSchema.validate(data, { abortEarly: false })
    return { isValid: true, errors: {} }
  } catch (err: any) {
    const errors: Record<string, string> = {}
    err.inner.forEach((e: any) => {
      errors[e.path] = e.message
    })
    return { isValid: false, errors }
  }
}

export const validateAssetField = async (fieldName: string, value: any, allData: any, t: (key: string) => string) => {
  const assetSchema = getAssetSchema(t)
  try {
    await assetSchema.validateAt(fieldName, { ...allData, [fieldName]: value })
    return { isValid: true, error: null }
  } catch (err: any) {
    return { isValid: false, error: err.message }
  }
}

export const templateAssignmentSchema = yup.object({
  templateId: yup.string().trim().required("Se requiere seleccionar una plantilla"),
})

export const validateTemplateAssignment = async (data: any) => {
  try {
    await templateAssignmentSchema.validate(data, { abortEarly: false })
    return { isValid: true, errors: {} }
  } catch (err: any) {
    const errors: Record<string, string> = {}
    err.inner.forEach((e: any) => {
      errors[e.path] = e.message
    })
    return { isValid: false, errors }
  }
}
