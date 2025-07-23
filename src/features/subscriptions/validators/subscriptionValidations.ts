// ===== subscriptionValidations.ts =====
import * as Yup from "yup";

export const validateSubscriptionForm = async (data: any, t: (key: string, options?: any) => string) => {
  const schemaFields: Record<string, any> = {};
  
  // Solo construir validaciones para los campos presentes
  if ('tipo' in data) {
    schemaFields.tipo = Yup.string()
      .required(t("subscriptions.errors.frequencyRequired"));
  }
  
  if ('fechaInicio' in data) {
    schemaFields.fechaInicio = Yup.string()
      .required(t("subscriptions.errors.startDateRequired"))
      .test(
        'is-valid-date',
        t("subscriptions.errors.invalidDate"),
        function(value) {
          if (!value) return false; // Requerido
          return /^\d{4}-\d{2}-\d{2}$/.test(value);
        }
      );
  }
  
  if ('fechaFin' in data) {
    schemaFields.fechaFin = Yup.string()
      .required(t("subscriptions.errors.endDateRequired")) // CAMBIO: Hacerlo requerido
      .test(
        'is-valid-date',
        t("subscriptions.errors.invalidDate"),
        function(value) {
          if (!value) return false; // CAMBIO: No permitir vacío
          return /^\d{4}-\d{2}-\d{2}$/.test(value);
        }
      )
      .test(
        'is-after-start',
        t("subscriptions.errors.endDateAfterStart"),
        function(value) {
          if (!value) return false; // CAMBIO: No permitir vacío
          const { fechaInicio } = this.parent;
          if (!fechaInicio) return true; // Si no hay fecha inicio, no podemos validar
          
          try {
            const startDate = new Date(fechaInicio);
            const endDate = new Date(value);
            return endDate >= startDate;
          } catch {
            return false;
          }
        }
      );
  }
  
  if ('estado' in data) {
    schemaFields.estado = Yup.string()
      .required(t("subscriptions.errors.statusRequired"))
      .oneOf(['active', 'inactive', 'pending'], t("subscriptions.errors.invalidStatus"));
  }

  const partialSchema = Yup.object().shape(schemaFields);

  try {
    await partialSchema.validate(data, { abortEarly: false });
    return { isValid: true, errors: {} };
  } catch (err: any) {
    const errors: Record<string, string> = {};
    if (err.inner) {
      err.inner.forEach((error: any) => {
        if (error.path) {
          errors[error.path] = error.message;
        }
      });
    }
    return { isValid: false, errors };
  }
};

// Función auxiliar para validación completa del formulario
export const validateCompleteSubscriptionForm = async (data: any, t: (key: string, options?: any) => string) => {
  // Para validación completa, asegurar que todos los campos estén presentes
  const completeData = {
    tipo: data.tipo || '',
    fechaInicio: data.fechaInicio || '',
    fechaFin: data.fechaFin || '',
    estado: data.estado || 'active'
  };
  
  return validateSubscriptionForm(completeData, t);
};