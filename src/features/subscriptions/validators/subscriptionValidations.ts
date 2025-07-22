import * as Yup from "yup";

export const validateSubscriptionForm = async (data: any, t: (key: string, options?: any) => string) => {
  const schemaFields: Record<string, any> = {};
  
  // Construimos el schema dinámicamente con las traducciones correctas
  if ('tipo' in data) {
    schemaFields.tipo = Yup.string()
      .required(t("subscriptions.errors.frequencyRequired"));
  }
  
  if ('fechaInicio' in data) {
    schemaFields.fechaInicio = Yup.date()
      .required(t("subscriptions.errors.startDateRequired"))
      .typeError(t("subscriptions.errors.invalidDate"));
  }
  
  if ('fechaFin' in data) {
    schemaFields.fechaFin = Yup.date()
      .nullable()
      .when('fechaInicio', {
        is: (fechaInicio: any) => fechaInicio != null,
        then: (schema) => schema.min(
          Yup.ref("fechaInicio"), 
          t("subscriptions.errors.endDateAfterStart")
        ),
        otherwise: (schema) => schema
      })
      .typeError(t("subscriptions.errors.invalidDate"));
  }
  
  if ('estado' in data) {
    schemaFields.estado = Yup.string()
      .required(t("subscriptions.errors.statusRequired"));
  }

  const partialSchema = Yup.object().shape(schemaFields);

  try {
    await partialSchema.validate(data, { abortEarly: false });
    return { isValid: true, errors: {} };
  } catch (err: any) {
    const errors: Record<string, string> = {};
    if (err.inner) {
      err.inner.forEach((error: any) => {
        if (error.path && error.path in data) {
          errors[error.path] = error.message;
        }
      });
    }
    return { isValid: false, errors };
  }
};