import * as yup from "yup"
import { TFunction } from "i18next"

export const getCuentaRegistroSchema = (t: TFunction) => yup.object({
  userName: yup
    .string()
    .trim()
    .required(t("personal.validation.usernameRequired"))
    .min(6, "El nombre de usuario debe tener al menos 6 caracteres")
    .max(50, "El nombre de usuario no puede tener más de 50 caracteres")
    .matches(/^[a-zA-Z0-9_]+$/, "El nombre de usuario solo puede contener letras, números y guiones bajos"),
  password: yup
    .string()
    .required(t("personal.validation.passwordRequired"))
    .min(6, t("personal.validation.passwordMinLength"))
    .max(100, "La contraseña no puede tener más de 100 caracteres"),
  confirmPassword: yup
    .string()
    .required(t("personal.validation.confirmPasswordRequired"))
    .oneOf([yup.ref("password")], t("personal.validation.passwordsDoNotMatch")),
})

// Mantener compatibilidad con código existente
export const cuentaRegistro = yup.object({
  userName: yup
    .string()
    .trim()
    .required("El nombre de usuario es obligatorio")
    .min(6, "El nombre de usuario debe tener al menos 6 caracteres")
    .max(50, "El nombre de usuario no puede tener más de 50 caracteres")
    .matches(/^[a-zA-Z0-9_]+$/, "El nombre de usuario solo puede contener letras, números y guiones bajos"),
  password: yup
    .string()
    .required("La contraseña es obligatoria")
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    .max(100, "La contraseña no puede tener más de 100 caracteres"),
  confirmPassword: yup
    .string()
    .required("Debe confirmar la contraseña")
    .oneOf([yup.ref("password")], "Las contraseñas no coinciden"),
})

export const validateRegisterForm = async (data: {
  userName: string
  password: string
  confirmPassword: string
}) => {
  try {
    await cuentaRegistro.validate(data, { abortEarly: false })
    return { isValid: true, errors: {} }
  } catch (err: any) {
    const errors: Record<string, string> = {}

    if (err.inner && Array.isArray(err.inner)) {
      err.inner.forEach((error: any) => {
        if (error.path) {
          errors[error.path] = error.message
        }
      })
    }

    return { isValid: false, errors }
  }
}

export const validateRegisterFormWithTranslation = async (
  data: {
    userName: string
    password: string
    confirmPassword: string
  },
  t: TFunction
) => {
  try {
    await getCuentaRegistroSchema(t).validate(data, { abortEarly: false })
    return { isValid: true, errors: {} }
  } catch (err: any) {
    const errors: Record<string, string> = {}

    if (err.inner && Array.isArray(err.inner)) {
      err.inner.forEach((error: any) => {
        if (error.path) {
          errors[error.path] = error.message
        }
      })
    }

    return { isValid: false, errors }
  }
}

// Validación individual de campos para feedback en tiempo real
export const validateField = async (
  fieldName: string,
  value: string,
  allData: {
    userName: string
    password: string
    confirmPassword: string
  },
) => {
  try {
    // Crear un esquema parcial para validar solo el campo específico
    let fieldSchema: any

    switch (fieldName) {
      case "userName":
        fieldSchema = yup.object({
          userName: cuentaRegistro.fields.userName,
        })
        await fieldSchema.validate({ userName: value })
        break

      case "password":
        fieldSchema = yup.object({
          password: cuentaRegistro.fields.password,
        })
        await fieldSchema.validate({ password: value })
        break

      case "confirmPassword":
        // Para confirmPassword necesitamos validar con la contraseña original
        fieldSchema = yup.object({
          password: cuentaRegistro.fields.password,
          confirmPassword: cuentaRegistro.fields.confirmPassword,
        })
        await fieldSchema.validate({
          password: allData.password,
          confirmPassword: value,
        })
        break
    }

    return { isValid: true, error: null }
  } catch (err: any) {
    return { isValid: false, error: err.message }
  }
}

// Validación individual de campos con traducciones
export const validateFieldWithTranslation = async (
  fieldName: string,
  value: string,
  allData: {
    userName: string
    password: string
    confirmPassword: string
  },
  t: TFunction
) => {
  try {
    const schema = getCuentaRegistroSchema(t)
    let fieldSchema: any

    switch (fieldName) {
      case "userName":
        fieldSchema = yup.object({
          userName: schema.fields.userName,
        })
        await fieldSchema.validate({ userName: value })
        break

      case "password":
        fieldSchema = yup.object({
          password: schema.fields.password,
        })
        await fieldSchema.validate({ password: value })
        break

      case "confirmPassword":
        // Para confirmPassword necesitamos validar con la contraseña original
        fieldSchema = yup.object({
          password: schema.fields.password,
          confirmPassword: schema.fields.confirmPassword,
        })
        await fieldSchema.validate({
          password: allData.password,
          confirmPassword: value,
        })
        break
    }

    return { isValid: true, error: null }
  } catch (err: any) {
    return { isValid: false, error: err.message }
  }
}
