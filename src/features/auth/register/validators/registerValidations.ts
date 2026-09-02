import * as yup from "yup"
import { TFunction } from "i18next"
import { sanitizeInput } from "@/utils/sanitizer"

export const getCuentaRegistroSchema = (t: TFunction) => yup.object({
  userName: yup
    .string()
    .trim()
    .required(t("personal.validation.usernameRequired"))
    .min(6, t("personal.validation.usernameMinLength"))
    .max(50, t("personal.validation.usernameMaxLength"))
    .matches(/^[a-zA-Z0-9_]+$/, t("personal.validation.usernameInvalidChars")),
  firstName: yup
    .string()
    .trim()
    .transform((value) => (typeof value === "string" ? sanitizeInput(value) : value))
    .required(t("personal.validation.firstNameRequired"))
    .min(2, t("personal.validation.firstNameMinLength"))
    .max(50, t("personal.validation.firstNameMaxLength"))
    .matches(/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s'-]+$/, t("personal.validation.firstNameInvalid")),
  lastName: yup
    .string()
    .trim()
    .transform((value) => (typeof value === "string" ? sanitizeInput(value) : value))
    .required(t("personal.validation.lastNameRequired"))
    .min(2, t("personal.validation.lastNameMinLength"))
    .max(50, t("personal.validation.lastNameMaxLength"))
    .matches(/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s'-]+$/, t("personal.validation.lastNameInvalid")),
  email: yup
    .string()
    .trim()
    .required(t("personal.validation.emailRequired"))
    .email(t("personal.validation.emailInvalid")),
  documento: yup
    .string()
    .trim()
    .transform((value) => (typeof value === "string" ? sanitizeInput(value) : value))
    .required(t("personal.validation.documentoRequired"))
    .matches(/^[0-9]{7,8}$/, t("personal.validation.documentoInvalid"))
    .min(5, t("personal.validation.documentoMinLength"))
    .max(20, t("personal.validation.documentoMaxLength")),
  password: yup
    .string()
    .required(t("personal.validation.passwordRequired"))
    .min(6, t("personal.validation.passwordMinLength"))
    .max(100, t("personal.validation.passwordMaxLength")),
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
  firstName: yup
    .string()
    .trim()
    .transform((value) => (typeof value === "string" ? sanitizeInput(value) : value))
    .required("El nombre es obligatorio para técnicos")
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(50, "El nombre no puede tener más de 50 caracteres")
    .matches(/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s'-]+$/, "El nombre solo puede contener letras, espacios, apóstrofes y guiones"),
  lastName: yup
    .string()
    .trim()
    .transform((value) => (typeof value === "string" ? sanitizeInput(value) : value))
    .required("El apellido es obligatorio para técnicos")
    .min(2, "El apellido debe tener al menos 2 caracteres")
    .max(50, "El apellido no puede tener más de 50 caracteres")
    .matches(/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s'-]+$/, "El apellido solo puede contener letras, espacios, apóstrofes y guiones"),
  email: yup
    .string()
    .trim()
    .required("El email es obligatorio para técnicos")
    .email("El email no es válido"),
  documento: yup
    .string()
    .trim()
    .transform((value) => (typeof value === "string" ? sanitizeInput(value) : value))
    .required("El documento es obligatorio para técnicos")
    .matches(/^[0-9]{7,8}$/, "El documento debe ser un DNI de 7 u 8 dígitos")
    .min(5, "El documento debe tener al menos 5 caracteres")
    .max(20, "El documento no puede tener más de 20 caracteres"),
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
  firstName: string
  lastName: string
  email: string
  documento: string
  fullName: string
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
    firstName: string
    lastName: string
    email: string
    documento: string
    fullName: string
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
    firstName: string
    lastName: string
    email: string
    documento: string
    fullName: string
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

      case "firstName":
        fieldSchema = yup.object({
          firstName: cuentaRegistro.fields.firstName,
        })
        await fieldSchema.validate({ firstName: value })
        break

      case "lastName":
        fieldSchema = yup.object({
          lastName: cuentaRegistro.fields.lastName,
        })
        await fieldSchema.validate({ lastName: value })
        break

      case "email":
        fieldSchema = yup.object({
          email: cuentaRegistro.fields.email,
        })
        await fieldSchema.validate({ email: value })
        break

      case "documento":
        fieldSchema = yup.object({
          documento: cuentaRegistro.fields.documento,
        })
        await fieldSchema.validate({ documento: value })
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
    firstName: string
    lastName: string
    email: string
    documento: string
    fullName: string
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

      case "firstName":
        fieldSchema = yup.object({
          firstName: schema.fields.firstName,
        })
        await fieldSchema.validate({ firstName: value })
        break

      case "lastName":
        fieldSchema = yup.object({
          lastName: schema.fields.lastName,
        })
        await fieldSchema.validate({ lastName: value })
        break

      case "email":
        fieldSchema = yup.object({
          email: schema.fields.email,
        })
        await fieldSchema.validate({ email: value })
        break

      case "documento":
        fieldSchema = yup.object({
          documento: schema.fields.documento,
        })
        await fieldSchema.validate({ documento: value })
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
