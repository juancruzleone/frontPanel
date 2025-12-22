import * as yup from "yup"
import { TFunction } from "i18next"

export const getCuentaRegistroSchema = (t: TFunction) => yup.object({
    userName: yup
        .string()
        .trim()
        .required(t("clients.validation.usernameRequired"))
        .min(6, t("clients.validation.usernameMinLength"))
        .max(50, t("clients.validation.usernameMaxLength"))
        .matches(/^[a-zA-Z0-9_]+$/, t("clients.validation.usernameMatches")),
    password: yup
        .string()
        .required(t("clients.validation.passwordRequired"))
        .min(6, t("clients.validation.passwordMinLength"))
        .max(100, t("clients.validation.passwordMaxLength")),
    confirmPassword: yup
        .string()
        .required(t("clients.validation.confirmPasswordRequired"))
        .oneOf([yup.ref("password")], t("clients.validation.passwordsDoNotMatch")),
})

export const validateRegisterFormWithTranslation = async (
    data: {
        userName: string
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

// Validación individual de campos con traducciones
export const validateFieldWithTranslation = async (
    fieldName: string,
    value: string,
    allData: {
        userName: string
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
