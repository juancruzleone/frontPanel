import * as yup from "yup"

export const cuentaLogin = yup.object({
  userName: yup
    .string()
    .trim()
    .required("El nombre de usuario es obligatorio"),

  password: yup
    .string()
    .required("La contraseña es obligatoria"),
})

export const validateLoginForm = async (data: {
  userName: string
  password: string
}) => {
  try {
    await cuentaLogin.validate(data, { abortEarly: false })
    return { isValid: true, errors: {} }
  } catch (err: any) {
    const errors: Record<string, string> = {}
    err.inner.forEach((e: any) => {
      errors[e.path] = e.message
    })
    return { isValid: false, errors }
  }
}
