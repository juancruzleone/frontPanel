import * as yup from "yup"
import { TFunction } from "i18next"

export const getLoginSchema = (t: TFunction) =>
  yup.object({
    userName: yup
      .string()
      .trim()
      .required(t("login.validation.userNameRequired")),
    password: yup
      .string()
      .required(t("login.validation.passwordRequired")),
  })

export const validateLoginForm = async (
  data: { userName: string; password: string },
  t: TFunction
) => {
  try {
    await getLoginSchema(t).validate(data, { abortEarly: false })
    return { isValid: true, errors: {} }
  } catch (err: any) {
    const errors: Record<string, string> = {}
    err.inner.forEach((e: any) => {
      errors[e.path] = e.message
    })
    return { isValid: false, errors }
  }
}
