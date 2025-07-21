import * as Yup from "yup";
import { t } from "i18next";

export const subscriptionValidationSchema = Yup.object().shape({
  nombre: Yup.string()
    .required(t("validations.required"))
    .max(100, t("validations.max", { max: 100 })),
  tipo: Yup.string()
    .required(t("validations.required"))
    .oneOf(["mensual", "trimestral", "semestral", "anual"], t("validations.invalidOption")),
  fechaInicio: Yup.date()
    .required(t("validations.required")),
  fechaFin: Yup.date()
    .nullable()
    .min(Yup.ref("fechaInicio"), t("validations.dateAfter", { field: t("fields.fechaInicio") })),
  estado: Yup.string()
    .required(t("validations.required"))
    .oneOf(["active", "inactive"], t("validations.invalidOption")),
  clienteId: Yup.string()
    .required(t("validations.required")),
  monto: Yup.number()
    .required(t("validations.required"))
    .min(0, t("validations.min", { min: 0 })),
});

export const validateSubscriptionForm = async (data: any, t: (key: string, options?: any) => string) => {
  try {
    await subscriptionValidationSchema.validate(data, { abortEarly: false })
    return { isValid: true, errors: {} }
  } catch (err: any) {
    const errors: Record<string, string> = {}
    if (err.inner) {
      err.inner.forEach((error: any) => {
        if (error.path) {
          errors[error.path] = error.message
        }
      })
    }
    return { isValid: false, errors }
  }
} 