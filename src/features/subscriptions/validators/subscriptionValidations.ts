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
      .test(
        'is-required-or-valid',
        function(value) {
          // Si no hay valor, es un error de campo requerido
          if (!value || value === '') {
            return this.createError({ message: t("subscriptions.errors.startDateRequired") });
          }
          // Si hay valor, verificar que sea válido
          if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return this.createError({ message: t("subscriptions.errors.invalidDate") });
          }
          return true;
        }
      );
  }
  
  if ('fechaFin' in data) {
    schemaFields.fechaFin = Yup.string()
      .test(
        'is-required-or-valid',
        function(value) {
          // Si no hay valor, es un error de campo requerido
          if (!value || value === '') {
            return this.createError({ message: t("subscriptions.errors.endDateRequired") });
          }
          // Si hay valor, verificar que sea válido
          if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return this.createError({ message: t("subscriptions.errors.invalidDate") });
          }
          return true;
        }
      )
      .test(
        'is-after-start',
        t("subscriptions.errors.endDateAfterStart"),
        function(value) {
          const { fechaInicio } = this.parent;
          
          // Si no hay fecha fin o fecha inicio, no validar
          if (!value || !fechaInicio) return true;
          
          // Si alguna fecha está vacía, no validar
          if (value === '' || fechaInicio === '') return true;
          
          // Verificar formato válido antes de comparar
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(fechaInicio) || !dateRegex.test(value)) return true;
          
          try {
            const startDate = new Date(fechaInicio);
            const endDate = new Date(value);
            
            // Verificar que las fechas sean válidas
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return true;
            
            return endDate >= startDate;
          } catch {
            return true;
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