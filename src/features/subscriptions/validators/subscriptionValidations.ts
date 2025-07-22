import * as Yup from "yup";

export const validateSubscriptionForm = async (data: any, t: (key: string, options?: any) => string) => {
  const schemaFields: Record<string, any> = {};
  
  // Construimos el schema dinámicamente con las traducciones correctas
  if ('tipo' in data) {
    schemaFields.tipo = Yup.string()
      .required(t("subscriptions.errors.frequencyRequired"));
  }
  
  if ('fechaInicio' in data) {
    schemaFields.fechaInicio = Yup.string()
      .required(t("subscriptions.errors.startDateRequired"))
      .matches(
        /^\d{4}-\d{2}-\d{2}$/,
        t("subscriptions.errors.invalidDate")
      );
  }
  
  if ('fechaFin' in data) {
    schemaFields.fechaFin = Yup.string()
      .nullable()
      .test(
        'is-after-start',
        t("subscriptions.errors.endDateAfterStart"),
        function(value) {
          const { fechaInicio } = this.parent;
          if (!value || !fechaInicio) return true;
          const startDate = new Date(fechaInicio);
          const endDate = new Date(value);
          return endDate >= startDate;
        }
      )
      .when('fechaInicio', {
        is: (fechaInicio: any) => !!fechaInicio,
        then: (schema) => schema.matches(
          /^\d{4}-\d{2}-\d{2}$/,
          t("subscriptions.errors.invalidDate")
        ),
        otherwise: (schema) => schema
      });
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