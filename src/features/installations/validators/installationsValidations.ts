import * as yup from "yup"

export const getInstallationSchema = (t: (key: string) => string) =>
  yup.object({
    company: yup.string().trim().required(t("installations.validation.companyRequired")),
    address: yup.string().trim().required(t("installations.validation.addressRequired")),
    installationType: yup.string().trim().required(t("installations.validation.typeRequired")),
    floorSector: yup.string().trim().required(t("installations.validation.floorSectorRequired")),
    postalCode: yup.string().trim().required(t("installations.validation.postalCodeRequired")),
    city: yup.string().trim().required(t("installations.validation.cityRequired")),
    province: yup.string().trim().required(t("installations.validation.provinceRequired")),
  })

export const validateInstallationForm = async (data: any, t: (key: string) => string) => {
  const schema = getInstallationSchema(t)
  try {
    await schema.validate(data, { abortEarly: false })
    return { isValid: true, errors: {} }
  } catch (err: any) {
    const errors: Record<string, string> = {}
    err.inner.forEach((e: any) => {
      errors[e.path] = e.message
    })
    return { isValid: false, errors }
  }
}

export const validateInstallationField = async (
  fieldName: string,
  value: any,
  allData: any,
  t: (key: string) => string
) => {
  const schema = getInstallationSchema(t)
  try {
    await schema.validateAt(fieldName, { ...allData, [fieldName]: value })
    return { isValid: true, error: null }
  } catch (err: any) {
    return { isValid: false, error: err.message }
  }
}
